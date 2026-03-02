import { db } from "../config/db.js";

// GET all raw items
export const getAllRawItems = async (req, res) => {
  const [rows] = await db.query("SELECT * FROM raw_items");
  res.json(rows);
};

// ADD raw item (FIXED)
export const addRawItem = async (req, res) => {
  const { name, unit, quantity, supplier } = req.body;

  // Insert
  const [result] = await db.query(
    `
      INSERT INTO raw_items (name, unit, quantity, supplier)
      VALUES (?, ?, ?, ?)
    `,
    [name, unit, quantity, supplier]
  );

  // Fetch saved item
  const [saved] = await db.query(
    "SELECT * FROM raw_items WHERE raw_item_id = ?",
    [result.insertId]
  );

  const item = saved[0];
  item.criticalStock = item.quantity <= 15;
  item.lowStock = item.quantity <= 10;

  res.json(item); // <-- Return FULL record
};


// UPDATE raw item
export const updateRawItem = async (req, res) => {
  const { id } = req.params;
  const { name, unit, quantity, supplier } = req.body;

  // Update the row
  await db.query(
    "UPDATE raw_items SET name=?, unit=?, quantity=?, supplier=? WHERE raw_item_id=?",
    [name, unit, quantity, supplier, id]
  );

  // Fetch updated row
  const [updated] = await db.query(
    "SELECT * FROM raw_items WHERE raw_item_id = ?",
    [id]
  );

  const item = updated[0];
  item.criticalStock = item.quantity <= 15;
  item.lowStock = item.quantity <= 10;

  res.json(item); // <-- Return FULL updated row
};
