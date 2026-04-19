import { db } from "../config/db.js";

export const getAllProducts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.price,
        p.status,
        p.approval_status,
        p.vat_type,
        p.image_name,
        p.image_path,
        p.created_by,
        p.branch_id,
        c.category_name,
        u.username AS created_by_name,
        b.branch_name
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN users u ON p.created_by = u.user_id
      LEFT JOIN branches b ON p.branch_id = b.branch_id
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_status, decline_reason } = req.body;

    await db.query(
      `
      UPDATE products 
      SET 
        approval_status = ?,
        decline_reason = ?,
        reviewed_by = ?,
        reviewed_at = NOW()
      WHERE product_id = ?
      `,
      [
        approval_status,
        approval_status === "DECLINED" ? decline_reason : null,
        req.user.user_id, // coming from decoded JWT
        id
      ]
    );

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMenuApprovedByBranch = async (req, res) => {
  try {
    const { branch_id } = req.params;

    const [rows] = await db.query(
      `SELECT p.product_id, p.product_name, p.price, p.status, p.approval_status, p.vat_type,
              p.image_name, p.image_path, p.created_by, p.branch_id,
              c.category_name
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       WHERE p.approval_status = 'APPROVED' AND p.branch_id = ?`,
      [branch_id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getMenuInventorybyid = async (req, res) => {
  try {
    const { product_id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        mi.product_id,
        mi.inventory_id,
        mi.servings_required,
        i.item_name,
        i.quantity_per_unit,
        i.servings_per_unit
       FROM menu_inventory mi
       JOIN ingredients i ON mi.inventory_id = i.ingredient_id
       WHERE mi.product_id = ?`,
      [product_id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


