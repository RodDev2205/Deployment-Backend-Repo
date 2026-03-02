import { db } from "../config/db.js";

// record a void request and update transaction status
export const voidTransaction = async (req, res) => {
  const { transaction_id, reason, admin_pin } = req.body;
  const cashier_id = req.user.user_id;
  const branch_id = req.user.branch_id;

  if (!transaction_id || !reason || !admin_pin) {
    return res.status(400).json({ message: "transaction_id, reason and admin_pin are required" });
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

    // insert void record
    const [result] = await connection.query(
      `INSERT INTO voids (transaction_id, cashier_id, manager_id, branch_id, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [transaction_id, cashier_id, admin.user_id, branch_id, reason]
    );

    // fetch items sold in this transaction
    const [items] = await connection.query(
      `SELECT menu_id, quantity FROM transaction_items WHERE transaction_id = ?`,
      [transaction_id]
    );

    // restore inventory servings for each ingredient linked to each menu item
    for (const item of items) {
      const [ingredients] = await connection.query(
        `SELECT inventory_id, servings_required FROM menu_inventory WHERE product_id = ?`,
        [item.menu_id]
      );
      for (const ing of ingredients) {
        const restoreAmount = ing.servings_required * item.quantity;
        await connection.query(
          `UPDATE inventory SET total_servings = total_servings + ? WHERE inventory_id = ?`,
          [restoreAmount, ing.inventory_id]
        );
      }
    }

    // update transaction status to voided
    await connection.query(
      `UPDATE transactions SET status = 'Voided' WHERE transaction_id = ?`,
      [transaction_id]
    );

    await connection.commit();
    res.json({ success: true, void_id: result.insertId, status: 'Voided' });
  } catch (error) {
    await connection.rollback();
    console.error("VOIDS ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    connection.release();
  }
};
