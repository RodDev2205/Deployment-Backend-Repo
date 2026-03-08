import { db } from "../config/db.js";
import { io } from "../../server.js"; // used to notify realtime updates

// Helper function to generate unique transaction number
const generateTransactionNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

export const completeSale = async (req, res) => {
  const { cart, paymentMethod, amountPaid, discount } = req.body;
  const user = req.user; // From JWT token

  if (!cart || cart.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  if (!paymentMethod || !amountPaid) {
    return res.status(400).json({ success: false, message: "Payment details required" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let subtotal = 0;
    const transactionItemsData = [];
    const ingredientDeductions = new Map(); // Track ingredient deductions needed

    // ==================== STEP 1: Validate items & collect ingredient needs ====================
    for (const item of cart) {
      const [productRows] = await connection.query(
        `SELECT product_id, price FROM products WHERE product_id = ?`,
        [item.product_id]
      );

      if (!productRows.length) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Product not found for product_id: ${item.product_id}`,
        });
      }

      const price = Number(productRows[0].price);
      const itemTotal = price * item.qty;
      subtotal += itemTotal;

      transactionItemsData.push({
        menu_id: item.product_id,
        quantity: item.qty,
        price: price,
        total: itemTotal,
      });

      // Get linked ingredients
      const [ingredientRows] = await connection.query(
        `SELECT inventory_id, servings_required FROM menu_inventory WHERE product_id = ?`,
        [item.product_id]
      );

      if (!ingredientRows || ingredientRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Product "${item.item || item.product_id}" has no linked ingredients. Please set up ingredients for this product.`,
        });
      }

      // Collect ingredient deductions
      for (const ingredient of ingredientRows) {
        const servingsNeeded = ingredient.servings_required * item.qty;
        const key = ingredient.inventory_id;

        ingredientDeductions.set(
          key,
          (ingredientDeductions.get(key) || 0) + servingsNeeded
        );
      }
    }

    // ==================== STEP 2: Check inventory ====================
    for (const [inventoryId, servingsNeeded] of ingredientDeductions) {
      const [inventoryRows] = await connection.query(
        `SELECT item_name, total_servings FROM inventory WHERE inventory_id = ?`,
        [inventoryId]
      );

      if (!inventoryRows.length) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Inventory item not found for ID: ${inventoryId}`,
        });
      }

      const inventory = inventoryRows[0];

      if (inventory.total_servings < servingsNeeded) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${inventory.item_name}". Available: ${inventory.total_servings}, Needed: ${servingsNeeded}`,
        });
      }
    }

    // ==================== STEP 3: Calculate totals ====================
    const discountObj = discount || { type: "none", value: 0 };
    let discountAmount = 0;

    if (discountObj.type === "percentage") {
      discountAmount = (subtotal * discountObj.value) / 100;
    } else if (discountObj.type === "fixed") {
      discountAmount = discountObj.value;
    }

    const totalAmount = subtotal - discountAmount;
    const changeAmount = Number(amountPaid) - totalAmount;

    if (changeAmount < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient payment. Total: ${totalAmount}, Paid: ${amountPaid}`,
      });
    }

    // ==================== STEP 4: Deduct servings and update quantity ====================
    for (const [inventoryId, servingsNeeded] of ingredientDeductions) {
      // Deduct servings
      await connection.query(
        `UPDATE inventory 
         SET total_servings = total_servings - ? 
         WHERE inventory_id = ?`,
        [servingsNeeded, inventoryId]
      );

      // Recompute quantity based on units
      const [[row]] = await connection.query(
        `SELECT quantity, servings_per_unit, total_servings, low_stock_threshold FROM inventory WHERE inventory_id = ?`,
        [inventoryId]
      );

      if (row) {
        const { servings_per_unit, total_servings, low_stock_threshold } = row;
        const newQty = Math.floor(total_servings / servings_per_unit);

        // Determine status: out_of_stock (0), low_stock (<= threshold), otherwise available
        let newStatus = 'available';
        if (newQty <= 0) newStatus = 'out_of_stock';
        else if (low_stock_threshold != null && newQty <= Number(low_stock_threshold)) newStatus = 'low_stock';

        await connection.query(
          `UPDATE inventory SET quantity = ?, status = ? WHERE inventory_id = ?`,
          [newQty, newStatus, inventoryId]
        );
      }
    }

    // ==================== STEP 5: Create transaction ====================
    const transactionNumber = generateTransactionNumber();

    const [transactionResult] = await connection.query(
      `INSERT INTO transactions 
       (transaction_number, subtotal, discount_type, discount_value, discount_amount, total_amount, payment_method, amount_paid, change_amount, cashier_id, branch_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionNumber,
        subtotal,
        discountObj.type || "none",
        discountObj.value || 0,
        discountAmount,
        totalAmount,
        paymentMethod,
        amountPaid,
        changeAmount,
        user.user_id,
        user.branch_id,
        'Completed',
      ]
    );

    const transactionId = transactionResult.insertId;

    console.log(`Transaction created with ID: ${transactionId}, Status: 'Completed'`);

    // ==================== STEP 6: Insert transaction items ====================
    for (const item of transactionItemsData) {
      await connection.query(
        `INSERT INTO transaction_items 
         (transaction_id, menu_id, quantity, price, total, voided_quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transactionId, item.menu_id, item.quantity, item.price, item.total, 0]
      );
    }

    await connection.commit();
    io.to(`branch_${user.branch_id}`).emit('dashboardUpdate', { branch_id: user.branch_id });
    io.emit('dashboardUpdate', { branch_id: user.branch_id });

    res.json({
      success: true,
      message: "Sale completed and inventory updated!",
      transactionId,
      transactionNumber,
      totalAmount,
      changeAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error("POS Error:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  } finally {
    connection.release();
  }
};

// GET transactions for current user and branch
export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const branchId = req.user.branch_id;

    const [rows] = await db.query(
      `SELECT transaction_id, transaction_number, created_at, total_amount, amount_paid, status
       FROM transactions
       WHERE cashier_id = ? AND branch_id = ?
       ORDER BY created_at DESC`,
      [userId, branchId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("DB ERROR (getUserTransactions):", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

// GET detailed information for single transaction (must belong to same branch/user)
export const getTransactionDetails = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.user.user_id;
    const branchId = req.user.branch_id;

    // Fetch transaction header
    const [[transaction]] = await db.query(
      `SELECT t.*, u.username AS cashier_name, b.branch_name
       FROM transactions t
       LEFT JOIN users u ON t.cashier_id = u.user_id
       LEFT JOIN branches b ON t.branch_id = b.branch_id
       WHERE t.transaction_id = ? AND t.branch_id = ?`,
      [transactionId, branchId]
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Optional: ensure cashier match so user only sees their own (admins could see all branch transactions)
    if (transaction.cashier_id !== userId && req.user.role_id !== 3) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Fetch items
    const [items] = await db.query(
      `SELECT ti.*, p.product_name
       FROM transaction_items ti
       LEFT JOIN products p ON ti.menu_id = p.product_id
       WHERE ti.transaction_id = ?`,
      [transactionId]
    );

    res.status(200).json({ transaction, items });
  } catch (error) {
    console.error("DB ERROR (getTransactionDetails):", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

// VOID transaction (full or partial)
export const voidTransaction = async (req, res) => {
  const { transaction_id, reason, admin_pin, void_items } = req.body;
  const user = req.user; // From JWT token

  if (!transaction_id || !reason || !admin_pin) {
    return res.status(400).json({ success: false, message: "Transaction ID, reason, and admin PIN are required" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Verify admin PIN
    const [adminRows] = await connection.query(
      `SELECT user_id FROM users
       WHERE pin_code = ? AND role_id IN (2,3) AND status = 'Activate'`,
      [admin_pin]
    );

    if (!adminRows.length) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Invalid admin PIN" });
    }

    // Get transaction details
    const [transactionRows] = await connection.query(
      `SELECT t.*, TIMESTAMPDIFF(MINUTE, t.created_at, NOW()) as minutes_elapsed
       FROM transactions t
       WHERE t.transaction_id = ? AND t.branch_id = ?`,
      [transaction_id, user.branch_id]
    );

    if (!transactionRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const transaction = transactionRows[0];

    // Check if void is allowed
    if (transaction.status !== 'Completed' && transaction.status !== 'Partial Voided') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Only completed or partially voided transactions can be voided" });
    }

    if (transaction.minutes_elapsed > 60) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Void not allowed after 1 hour" });
    }

    // Get transaction items
    const [itemsRows] = await connection.query(
      `SELECT ti.*, p.product_name
       FROM transaction_items ti
       LEFT JOIN products p ON ti.menu_id = p.product_id
       WHERE ti.transaction_id = ?`,
      [transaction_id]
    );

    // Determine void type and items to void
    let voidType = 'full';
    let itemsToVoid = itemsRows;

    if (void_items && Object.keys(void_items).length > 0) {
      voidType = 'partial';
      // Filter items that are being voided
      itemsToVoid = itemsRows.filter(item => void_items[item.menu_id] > 0);
    }

    console.log("itemsRows:", itemsRows);
    console.log("itemsToVoid:", itemsToVoid);

    // Restore inventory for voided items
    for (const item of itemsToVoid) {
      const voidQty = voidType === 'full' ? item.quantity : (void_items[item.menu_id] || 0);

      if (voidQty <= 0) continue;

      // Get ingredients for this product
      const [ingredientRows] = await connection.query(
        `SELECT inventory_id, servings_required FROM menu_inventory WHERE product_id = ?`,
        [item.menu_id]
      );

      // Restore servings
      for (const ingredient of ingredientRows) {
        const servingsToRestore = ingredient.servings_required * voidQty;

        // Restore servings
        await connection.query(
          `UPDATE inventory SET total_servings = total_servings + ? WHERE inventory_id = ?`,
          [servingsToRestore, ingredient.inventory_id]
        );

        // Recompute quantity
        const [[inventoryRow]] = await connection.query(
          `SELECT quantity, servings_per_unit, total_servings, low_stock_threshold FROM inventory WHERE inventory_id = ?`,
          [ingredient.inventory_id]
        );

        if (inventoryRow) {
          const { servings_per_unit, total_servings, low_stock_threshold } = inventoryRow;
          const newQty = Math.floor(total_servings / servings_per_unit);

          // Determine status
          let newStatus = 'available';
          if (newQty <= 0) newStatus = 'out_of_stock';
          else if (low_stock_threshold != null && newQty <= Number(low_stock_threshold)) newStatus = 'low_stock';

          await connection.query(
            `UPDATE inventory SET quantity = ?, status = ? WHERE inventory_id = ?`,
            [newQty, newStatus, ingredient.inventory_id]
          );
        }
      }
    }

    // Update transaction status
    const [[{totalRemaining}]] = await connection.query(
      `SELECT COALESCE(SUM(quantity), 0) as totalRemaining FROM transaction_items WHERE transaction_id = ?`,
      [transaction_id]
    );
    console.log("totalRemaining:", totalRemaining);
    const newStatus = totalRemaining === 0 ? 'Voided' : 'Partial Voided';
    await connection.query(
      `UPDATE transactions SET status = ? WHERE transaction_id = ?`,
      [newStatus, transaction_id]
    );

    console.log("Updated status to:", newStatus);

    // Log void action
    await connection.query(
      `INSERT INTO transaction_logs (transaction_id, action, performed_by, reason, details)
       VALUES (?, 'void', ?, ?, ?)`,
      [transaction_id, user.user_id, reason, JSON.stringify({
        void_type: voidType,
        void_items: void_items || null,
        original_status: transaction.status
      })]
    );

    // For partial void, update refunded quantities
    if (voidType === 'partial') {
      for (const [menuId, qty] of Object.entries(void_items)) {
        if (qty > 0) {
          await connection.query(
            `UPDATE transaction_items SET refunded_qty = COALESCE(refunded_qty, 0) + ? WHERE transaction_id = ? AND menu_id = ?`,
            [qty, transaction_id, menuId]
          );
        }
      }
    }

    await connection.commit();

    // Emit dashboard updates
    io.to(`branch_${user.branch_id}`).emit('dashboardUpdate', { branch_id: user.branch_id });
    io.emit('dashboardUpdate', { branch_id: user.branch_id });

    res.json({
      success: true,
      message: `Transaction ${voidType === 'full' ? 'fully' : 'partially'} voided successfully`,
      status: newStatus
    });

  } catch (error) {
    await connection.rollback();
    console.error("Void Error:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  } finally {
    connection.release();
  }
};
