import { db } from "../config/db.js";

// record a void request and update transaction status
export const voidTransaction = async (req, res) => {
  const { transaction_id, reason, admin_pin, void_items } = req.body;
  const cashier_id = req.user.user_id;
  const branch_id = req.user.branch_id;

  console.log("Void request received:", { transaction_id, reason, admin_pin: admin_pin ? "***" : null, void_items, cashier_id, branch_id });

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

    console.log("Admin lookup result:", admin ? "Found admin" : "No admin found");

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

    // fetch all items sold in this transaction
    const [allItems] = await connection.query(
      `SELECT menu_id, quantity FROM transaction_items WHERE transaction_id = ?`,
      [transaction_id]
    );

    // determine whether full or partial void
    let itemsToVoid = [];
    if (void_items && Object.keys(void_items).length > 0) {
      // partial: object mapping menu_id->qty
      itemsToVoid = allItems.map(it => ({
        ...it,
        void_qty: Math.min(it.quantity, Number(void_items[it.menu_id] || 0))
      })).filter(it => it.void_qty > 0);
    } else {
      // full void
      itemsToVoid = allItems.map(it => ({ ...it, void_qty: it.quantity }));
    }

    console.log("allItems:", allItems);
    console.log("itemsToVoid:", itemsToVoid);

    // restore inventory and update transaction_items: mark voided items as void, decrement quantities
    for (const item of itemsToVoid) {
      const [ingredients] = await connection.query(
        `SELECT inventory_id, servings_required FROM menu_inventory WHERE product_id = ?`,
        [item.menu_id]
      );
      for (const ing of ingredients) {
        const restoreAmount = ing.servings_required * item.void_qty;
        await connection.query(
          `UPDATE inventory SET total_servings = total_servings + ? WHERE inventory_id = ?`,
          [restoreAmount, ing.inventory_id]
        );
      }
      
      // For voided items: increment voided_quantity (don't change original quantity)
      await connection.query(
        `UPDATE transaction_items
         SET voided_quantity = voided_quantity + ?
         WHERE transaction_id = ? AND menu_id = ?`,
        [item.void_qty, transaction_id, item.menu_id]
      );
    }

    // Check if transaction is fully voided (all items have voided_quantity >= quantity)
    const [itemsCheck] = await connection.query(
      `SELECT COUNT(*) as total_items, 
              SUM(CASE WHEN voided_quantity >= quantity THEN 1 ELSE 0 END) as fully_voided_items
       FROM transaction_items WHERE transaction_id = ?`,
      [transaction_id]
    );
    
    const isFullyVoided = itemsCheck[0].total_items === itemsCheck[0].fully_voided_items;
    const newStatus = isFullyVoided ? 'Voided' : 'Partial Voided';

    await connection.query(
      `UPDATE transactions SET status = ? WHERE transaction_id = ?`,
      [newStatus, transaction_id]
    );

    console.log("Updated status to:", newStatus);

    await connection.commit();
    res.json({ success: true, void_id: result.insertId, status: newStatus });
  } catch (error) {
    await connection.rollback();
    console.error("VOIDS ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    connection.release();
  }
};

export const getpinCode = async (req, res) => {
  const { user_id } = req.user;
  try {
    const [rows] = await db.query(
      `SELECT pin_code FROM users WHERE user_id = ?`,
      [user_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("DB ERROR (getpinCode):", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};
