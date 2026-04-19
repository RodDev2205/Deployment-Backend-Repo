import { db } from "../config/db.js";

// Process refund (full or partial)
export const refundTransaction = async (req, res) => {
  const { transaction_id, refund_type, refund_items, reason, admin_pin } = req.body;
  const cashier_id = req.user.user_id;
  const branch_id = req.user.branch_id;

  if (!transaction_id || !refund_type || !reason || !admin_pin) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (refund_type !== "full" && refund_type !== "partial") {
    return res.status(400).json({ message: "Invalid refund_type" });
  }

  if (refund_type === "partial" && (!refund_items || refund_items.length === 0)) {
    return res.status(400).json({ message: "Partial refund requires refund_items" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // verify admin pin
    const [[admin]] = await connection.query(
      `SELECT user_id FROM users
       WHERE pin_code = ? AND role_id IN (2,3) AND status = 'Activate'`,
      [admin_pin]
    );

    if (!admin) {
      await connection.rollback();
      return res.status(403).json({ message: "Invalid admin PIN" });
    }

    // fetch all items in transaction
    const [allItems] = await connection.query(
      `SELECT menu_id, quantity, price FROM transaction_items WHERE transaction_id = ?`,
      [transaction_id]
    );

    // determine which items to refund
    let itemsToRefund = [];
    if (refund_type === "full") {
      itemsToRefund = allItems.map(item => ({
        ...item,
        refund_qty: item.quantity,
      }));
    } else {
      // partial: use provided refund_items
      itemsToRefund = refund_items.map(ri => {
        const originalItem = allItems.find(ai => ai.menu_id === ri.menu_id);
        if (!originalItem) {
          throw new Error(`Menu item ${ri.menu_id} not found in transaction`);
        }
        return {
          menu_id: ri.menu_id,
          price: originalItem.price,
          quantity: originalItem.quantity,
          refund_qty: ri.refund_qty,
        };
      });
    }

    // calculate refund amount
    let refundAmount = 0;
    itemsToRefund.forEach(item => {
      refundAmount += item.refund_qty * item.price;
    });

    // restore inventory for each refunded item
    for (const item of itemsToRefund) {
      const [ingredients] = await connection.query(
        `SELECT mi.servings_required, i.ingredient_id, i.item_name
         FROM menu_inventory mi
         JOIN ingredients i ON mi.ingredient_id = i.ingredient_id
         WHERE mi.product_id = ?`,
        [item.menu_id]
      );
      for (const ing of ingredients) {
        const restoreAmount = ing.servings_required * item.refund_qty;
        await connection.query(
          `UPDATE inventory SET total_servings = total_servings + ? WHERE item_name = ? AND branch_id = ?`,
          [restoreAmount, ing.item_name, branch_id]
        );
      }
      // decrement the sold quantity so subsequent detail fetches show remaining
      await connection.query(
        `UPDATE transaction_items
         SET quantity = GREATEST(0, quantity - ?)
         WHERE transaction_id = ? AND menu_id = ?`,
        [item.refund_qty, transaction_id, item.menu_id]
      );
    }

    // insert refund record
    const [result] = await connection.query(
      `INSERT INTO refunds (transaction_id, manager_id, branch_id, refund_amount, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [transaction_id, admin.user_id, branch_id, refundAmount, reason]
    );

    // update transaction status
    const newStatus = refund_type === "full" ? "Refunded" : "Partial Refunded";
    await connection.query(
      `UPDATE transactions SET status = ? WHERE transaction_id = ?`,
      [newStatus, transaction_id]
    );

    await connection.commit();
    res.json({
      success: true,
      refund_id: result.insertId,
      refund_amount: refundAmount,
      status: newStatus,
    });
  } catch (error) {
    await connection.rollback();
    console.error("REFUND ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    connection.release();
  }
};
