import { db } from "../config/db.js";
import { calculateSeniorPWDDiscount, validateCartForDiscount } from "../utils/discountCalculator.js";
// import { io } from "../../server.js"; // moved to dynamic import to avoid circular dependency

// NOTE: Ensure your database schema includes an `order_type` column in transactions,
// e.g.:
// ALTER TABLE transactions ADD COLUMN order_type VARCHAR(20) NOT NULL DEFAULT 'dine-in';
// values will be 'dine-in' or 'takeout'.

// Helper function to log POS activities
async function logPOSActivity({ userId, branchId, activityType, description, referenceId }) {
  try {
    console.log(`📝 Attempting to log POS activity: ${activityType} for user ${userId}`);
    const result = await db.query(
      `INSERT INTO activity_logs
        (user_id, branch_id, activity_type, reference_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, branchId, activityType, referenceId, description]
    );
    console.log(`✅ Logged POS activity: ${activityType}, inserted ID:`, result[0]?.insertId);
  } catch (err) {
    console.error('❌ Failed to log POS activity:', err);
    console.error('Activity details:', { userId, branchId, activityType, description, referenceId });
    // Don't throw - just log the error. The main operation should still succeed
  }
}

// Helper function to generate unique transaction number
const generateTransactionNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

/**
 * Deducts inventory for a POS order
 * @param {number} productId - The product ID being ordered
 * @param {number} quantityOrdered - Quantity of the product ordered
 * @param {number} branchId - Branch ID where inventory should be deducted
 * @param {Object} connection - Database connection (for transaction support)
 * @returns {Object} - Success status and details
 */
export const deductInventoryForOrder = async (productId, quantityOrdered, branchId, connection) => {
  try {
    // ==================== STEP 1: Get all ingredients for this product ====================
    const [ingredientRows] = await connection.query(
      `SELECT ingredient_id, servings_required
       FROM menu_inventory
       WHERE product_id = ?`,
      [productId]
    );

    if (!ingredientRows || ingredientRows.length === 0) {
      throw new Error(`Product ${productId} has no linked ingredients. Please set up ingredients for this product.`);
    }

    // ==================== STEP 2: Validate all ingredients have sufficient stock ====================
    const ingredientValidations = [];

    for (const ingredient of ingredientRows) {
      const requiredServings = ingredient.servings_required * quantityOrdered;

      // Get current inventory for this ingredient in the branch
      const [inventoryRows] = await connection.query(
        `SELECT inventory_id, item_name, quantity, servings_per_unit, total_servings, low_stock_threshold, status
         FROM inventory
         WHERE inventory_id = ? AND branch_id = ?`,
        [ingredient.ingredient_id, branchId]
      );

      if (!inventoryRows || inventoryRows.length === 0) {
        throw new Error(`Ingredient not found in branch inventory. Please add the ingredient to your branch.`);
      }

      const inventory = inventoryRows[0];
      const availableServings = inventory.total_servings;

      if (availableServings < requiredServings) {
        throw new Error(`Insufficient stock for "${inventory.item_name}". Available: ${availableServings}, Required: ${requiredServings}`);
      }

      ingredientValidations.push({
        inventoryId: inventory.inventory_id,
        itemName: inventory.item_name,
        currentQuantity: inventory.quantity,
        servingsPerUnit: inventory.servings_per_unit,
        lowStockThreshold: inventory.low_stock_threshold,
        requiredServings: requiredServings,
        servingsDeducted: requiredServings
      });
    }

    // ==================== STEP 3: Deduct inventory for all validated ingredients ====================
    const deductionResults = [];

    for (const validation of ingredientValidations) {
      // servingsDeducted is already calculated in validation
      const servingsDeducted = validation.servingsDeducted;

      // Calculate units to deduct based on servings consumed
      const unitsToDeduct = Math.floor(servingsDeducted / validation.servingsPerUnit);

      // Update quantity and total servings
      const newQuantity = Math.max(0, validation.currentQuantity - unitsToDeduct);
      const newTotalServings = Math.max(0, (validation.currentQuantity * validation.servingsPerUnit) - servingsDeducted);

      // Determine new status based on total servings
      let newStatus;
      if (newTotalServings <= 0) {
        newStatus = 'out_of_stock';
      } else if (newTotalServings <= validation.lowStockThreshold * validation.servingsPerUnit) {
        newStatus = 'low_stock';
      } else {
        newStatus = 'available';
      }

      // Update inventory
      await connection.query(
        `UPDATE inventory
         SET quantity = ?, total_servings = ?, status = ?
         WHERE inventory_id = ? AND branch_id = ?`,
        [newQuantity, newTotalServings, newStatus, validation.inventoryId, branchId]
      );

      deductionResults.push({
        inventoryId: validation.inventoryId,
        itemName: validation.itemName,
        previousQuantity: validation.currentQuantity,
        previousTotalServings: validation.currentQuantity * validation.servingsPerUnit,
        newQuantity: newQuantity,
        newTotalServings: newTotalServings,
        servingsDeducted: servingsDeducted,
        unitsDeducted: unitsToDeduct,
        newStatus: newStatus
      });
    }

    return {
      success: true,
      message: `Inventory deducted successfully for product ${productId}`,
      productId: productId,
      quantityOrdered: quantityOrdered,
      branchId: branchId,
      deductions: deductionResults
    };

  } catch (error) {
    console.error('Inventory deduction error:', error);
    return {
      success: false,
      message: error.message,
      productId: productId,
      quantityOrdered: quantityOrdered,
      branchId: branchId
    };
  }
};

export const completeSale = async (req, res) => {
  const { cart, paymentMethod, amountPaid, discount, orderType } = req.body;
  const user = req.user; // From JWT token
  const order_type = orderType && (orderType === 'takeout' || orderType === 'dine-in') ? orderType : 'dine-in';

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
    let vatExclusiveSubtotal = 0;
    const transactionItemsData = [];

    // ==================== STEP 1: Validate items & collect ingredient needs ====================
    for (const item of cart) {
      console.log(`🛒 Processing cart item: ${JSON.stringify(item)}`);

      const [productRows] = await connection.query(
        `SELECT product_id, price, vat_type FROM products WHERE product_id = ?`,
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
      const vatType = productRows[0].vat_type;
      const priceExclVat = vatType === 'vat' ? price / 1.12 : price;
      const itemTotal = price * item.qty;
      const itemTotalExclVat = priceExclVat * item.qty;

      subtotal += itemTotal;
      vatExclusiveSubtotal += itemTotalExclVat;

      transactionItemsData.push({
        menu_id: item.product_id,
        quantity: item.qty,
        price: price,
        total: itemTotal,
        priceExclVat,
        totalExclVat: itemTotalExclVat,
      });

      console.log(`📦 Calling deductInventoryForOrder for product ${item.product_id}, quantity ${item.qty}`);

      // Get linked ingredients and validate/deduct inventory for this product
      const deductionResult = await deductInventoryForOrder(item.product_id, item.qty, user.branch_id, connection);

      if (!deductionResult.success) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: deductionResult.message,
        });
      }

      console.log(`✅ Deduction successful for product ${item.product_id}:`, deductionResult.deductions);
    }

    // ==================== STEP 2: Calculate totals ====================
    // IMPORTANT: For senior/PWD discounts, we apply 20% to VAT-EXCLUSIVE prices
    // But we ALWAYS store the original VAT-INCLUSIVE subtotal for accurate reporting

    const discountObj = discount || { type: "none", value: 0, amount: 0 };
    let discountAmount = discountObj.amount || 0;
    const useVatExclusivePricing = discountObj.type === "senior" || discountObj.type === "pwd";
    
    // Use VAT-exclusive for discount calculation only
    const effectiveSubtotal = useVatExclusivePricing ? vatExclusiveSubtotal : subtotal;

    if (discountObj.type === "percentage") {
      discountAmount = discountAmount || (effectiveSubtotal * discountObj.value) / 100;
    } else if (discountObj.type === "fixed") {
      discountAmount = discountAmount || discountObj.value;
    } else if (useVatExclusivePricing) {
      // Senior and PWD discounts are both a fixed 20% discount applied to VAT-exclusive prices.
      discountObj.value = 0.2;
      discountAmount = discountAmount || effectiveSubtotal * 0.2;
    }

    const totalAmount = effectiveSubtotal - discountAmount;
    const changeAmount = Number(amountPaid) - totalAmount;

    if (changeAmount < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient payment. Total: ${totalAmount}, Paid: ${amountPaid}`,
      });
    }

    // ==================== STEP 3: Create transaction ====================
    const transactionNumber = generateTransactionNumber();

    const [transactionResult] = await connection.query(
      `INSERT INTO transactions
       (transaction_number, subtotal, discount_type, discount_value, discount_amount,
        total_amount, payment_method, amount_paid, change_amount,
        cashier_id, branch_id, status, order_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionNumber,
        subtotal,  // ✓ FIX: Always store original VAT-INCLUSIVE subtotal for accurate reporting
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
        order_type,
      ]
    );

    const transactionId = transactionResult.insertId;

    console.log(`Transaction created with ID: ${transactionId}, Status: 'Completed'`);

    // ==================== STEP 4: Insert transaction items ====================
    for (const item of transactionItemsData) {
      // ✓ FIX: Always store original prices (VAT-inclusive), not VAT-exclusive
      // This ensures accurate item-level tracking and reconciliation
      await connection.query(
        `INSERT INTO transaction_items 
         (transaction_id, menu_id, quantity, price, total, voided_quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transactionId, item.menu_id, item.quantity, item.price, item.total, 0]
      );
    }

    // ==================== STEP 5: Insert discount details if applicable ====================
    if ((discountObj.type === "senior" || discountObj.type === "pwd") && discountObj.verification) {
      await connection.query(
        `INSERT INTO discount_details (name, id_number, discount_type, transaction_id)
         VALUES (?, ?, ?, ?)`,
        [
          discountObj.verification.fullName,
          discountObj.verification.idNumber,
          discountObj.type,
          transactionId
        ]
      );
    }

    await connection.commit();

    // Log the completed transaction
    await logPOSActivity({
      userId: user.user_id,
      branchId: user.branch_id,
      activityType: 'transaction_completed',
      description: `Completed transaction ${transactionNumber} (${order_type}) - Total: ₱${totalAmount.toFixed(2)}, Paid: ₱${amountPaid.toFixed(2)}`,
      referenceId: transactionId
    });

    // Dynamic import to avoid circular dependency
    const { io } = await import("../../server.js");
    io.to(`branch_${user.branch_id}`).emit('dashboardUpdate', { branch_id: user.branch_id });
    io.emit('dashboardUpdate', { branch_id: user.branch_id });

    res.json({
      success: true,
      message: "Sale completed and inventory updated!",
      transactionId,
      transactionNumber,
      totalAmount,
      changeAmount,
      cashierName: user.name || user.username || 'Cashier',
      discountType: discountObj?.type || 'none',
      discountAmount: discountAmount ?? 0,
      discountHolderName: discount?.holderName || '',
      discountHolderId: discount?.holderId || '',
    });
  } catch (error) {
    await connection.rollback();
    console.error("POS Error:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  } finally {
    connection.release();
  }
};

/**
 * Creates a new transaction
 * @param {number} branchId - The branch ID
 * @param {Array} items - Array of items [{product_id, price, quantity}]
 * @param {Object} options - Additional options
 * @param {string} options.paymentMethod - Payment method
 * @param {number} options.amountPaid - Amount paid by customer
 * @param {number} options.cashierId - Cashier user ID
 * @param {string} options.orderType - Order type ('dine-in' or 'takeout')
 * @param {Object} options.discount - Discount object {type: 'percentage'|'fixed'|'senior'|'pwd', value: number}
 *                                   For senior and pwd, the backend treats value as 0.2 (20%).
 * @param {Object} options.verification - Verification data for senior/pwd {fullName, idNumber, discountType}
 * @returns {Object} Transaction details
 */
export const createTransaction = async (branchId, items, options = {}) => {
  if (!branchId || !items || items.length === 0) {
    throw new Error('Branch ID and items array are required');
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();



    // Calculate subtotal
    let subtotal = 0;
    for (const item of items) {
      if (!item.product_id || !item.price || !item.quantity) {
        throw new Error('Each item must have product_id, price, and quantity');
      }
      subtotal += Number(item.price) * Number(item.quantity);
    }

    // Calculate discount if provided
    // IMPORTANT: For senior/PWD discounts, we apply 20% to original amounts
    // But we ALWAYS store the original subtotal for accurate reporting
    const discount = options.discount || { type: 'none', value: 0 };
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (subtotal * discount.value) / 100;
    } else if (discount.type === 'fixed') {
      discountAmount = discount.value;
    } else if (discount.type === 'senior' || discount.type === 'pwd') {
      discount.value = 0.2;
      discountAmount = subtotal * 0.2;
    }

    // Calculate total
    const totalAmount = subtotal - discountAmount;

    // Generate transaction number
    const transactionNumber = generateTransactionNumber();

    // Insert transaction
    // ✓ FIX: Always store original subtotal for accurate reporting
    const [transactionResult] = await connection.query(
      `INSERT INTO transactions
       (transaction_number, subtotal, discount_type, discount_value, discount_amount,
        total_amount, payment_method, amount_paid, change_amount,
        cashier_id, branch_id, status, order_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        transactionNumber,
        subtotal,  // ✓ Store original subtotal
        discount.type || 'none',
        discount.value || 0,
        discountAmount,
        totalAmount,
        options.paymentMethod || 'cash',
        options.amountPaid || totalAmount,
        (options.amountPaid || totalAmount) - totalAmount,
        options.cashierId || null,
        branchId,
        'Completed',
        options.orderType || 'dine-in'
      ]
    );

    const transactionId = transactionResult.insertId;

    // Insert transaction items
    // ✓ FIX: Always store original prices
    for (const item of items) {
      await connection.query(
        `INSERT INTO transaction_items
         (transaction_id, menu_id, quantity, price, total, voided_quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          item.product_id,
          item.quantity,
          item.price,
          Number(item.price) * Number(item.quantity),
          0
        ]
      );
    }

    // Insert discount details if applicable
    if ((discount.type === "senior" || discount.type === "pwd") && discount.verification) {
      await connection.query(
        `INSERT INTO discount_details (name, id_number, discount_type, transaction_id)
         VALUES (?, ?, ?, ?)`,
        [
          discount.verification.fullName,
          discount.verification.idNumber,
          discount.type,
          transactionId
        ]
      );
    }

    await connection.commit();

    return {
      transactionId,
      transactionNumber,
      subtotal,
      discountAmount,
      totalAmount,
      items: items.length
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// GET transactions for current user and branch
export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const branchId = req.user.branch_id;

    // All users (including admins) see only their own transactions
    const [rows] = await db.query(
      `SELECT transaction_id, transaction_number, created_at, total_amount, amount_paid, status, order_type
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
      `SELECT t.*, u.username AS cashier_name, b.branch_name,
              b.address AS branch_address, b.contact_number AS branch_contact
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

    // Fetch discount details if applicable (senior or pwd discount)
    let discountDetails = null;
    if (transaction.discount_type === 'senior' || transaction.discount_type === 'pwd') {
      const [discountRows] = await db.query(
        `SELECT name, id_number, discount_type FROM discount_details WHERE transaction_id = ?`,
        [transactionId]
      );
      
      if (discountRows && discountRows.length > 0) {
        discountDetails = discountRows[0];
      }
    }

    // transaction object now includes branch_address and branch_contact
    res.status(200).json({ transaction, items, discountDetails });
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
        `SELECT ingredient_id, servings_required FROM menu_inventory WHERE product_id = ?`,
        [item.menu_id]
      );

      // Restore servings
      for (const ingredient of ingredientRows) {
        const servingsToRestore = ingredient.servings_required * voidQty;

        // Get current stock and servings per unit
        const [[row]] = await connection.query(
          `SELECT inv.quantity as stock_units, inv.servings_per_unit
           FROM inventory inv
           WHERE inv.inventory_id = ? AND inv.branch_id = ?`,
          [ingredient.ingredient_id, user.branch_id]
        );

        if (row) {
          const { stock_units, servings_per_unit } = row;
          const unitsToRestore = servingsToRestore / servings_per_unit;
          const newStockUnits = stock_units + unitsToRestore;

          // Update quantity
          await connection.query(
            `UPDATE inventory SET quantity = ? WHERE inventory_id = ? AND branch_id = ?`,
            [newStockUnits, ingredient.ingredient_id, user.branch_id]
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

    // Log the void transaction
    await logPOSActivity({
      userId: user.user_id,
      branchId: user.branch_id,
      activityType: voidType === 'full' ? 'transaction_voided' : 'transaction_partial_void',
      description: `${voidType === 'full' ? 'Fully' : 'Partially'} voided transaction ${transaction.transaction_number} - Reason: ${reason}`,
      referenceId: transaction_id
    });

    // Emit dashboard updates - dynamic import to avoid circular dependency
    const { io } = await import("../../server.js");
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

/**
 * Calculate Senior/PWD discount with per-item discount quantity
 * POST /api/pos/calculate-senior-pwd-discount
 * 
 * Request body:
 * {
 *   cart: [
 *     {
 *       product_id: number,
 *       name: string,
 *       price: number (VAT-inclusive),
 *       qty: number,
 *       discountQty: number (units to apply discount)
 *     }
 *   ]
 * }
 * 
 * Returns discount breakdown with ₱250 cap
 */
export const calculateSeniorPWDDiscountAPI = async (req, res) => {
  const { cart } = req.body;

  // Validate input
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cart must be a non-empty array'
    });
  }

  // Validate cart before processing
  const validation = await validateCartForDiscount(cart);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message
    });
  }

  // Calculate discount
  const result = await calculateSeniorPWDDiscount(cart);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error
    });
  }

  res.json({
    success: true,
    data: result
  });
};

/**
 * API endpoint to test inventory deduction for a single product order
 * POST /api/pos/deduct-inventory
 * Body: { product_id: number, quantity_ordered: number, branch_id: number }
 */
export const testDeductInventory = async (req, res) => {
  const { product_id, quantity_ordered, branch_id } = req.body;

  // Validate required fields
  if (!product_id || !quantity_ordered || !branch_id) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: product_id, quantity_ordered, branch_id"
    });
  }

  if (quantity_ordered <= 0) {
    return res.status(400).json({
      success: false,
      message: "quantity_ordered must be greater than 0"
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Call the inventory deduction function
    const result = await deductInventoryForOrder(product_id, quantity_ordered, branch_id, connection);

    if (result.success) {
      await connection.commit();
      res.json({
        success: true,
        message: "Inventory deducted successfully",
        data: result
      });
    } else {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: result.message,
        data: result
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error("Test inventory deduction error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  } finally {
    connection.release();
  }
};
