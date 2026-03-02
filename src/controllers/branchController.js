import { db } from "../config/db.js";

export const createBranch = async (req, res) => {
      console.log("DEBUG: req.user =", req.user); // 🔥 Add this line

  try {
    const {
      branchName,
      address,
      contact,
      openingTime,
      closingTime
    } = req.body;

    if (!branchName || !address || !contact || !openingTime || !closingTime) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [result] = await db.query(
      `
      INSERT INTO branches
      (branch_name, address, contact_number, opening_time, closing_time, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        branchName,
        address,
        contact,
        openingTime,
        closingTime,
        req.user.user_id // comes from JWT
      ]
    );

    res.status(201).json({
      message: "Branch created successfully",
      branchId: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}; 

export const getBranches = async (req, res) => {
  try {
    const [branches] = await db.query(`
      SELECT 
        b.branch_id, 
        b.branch_name AS name,
        b.address, 
        b.contact_number AS contact,
        b.opening_time AS openingTime,
        b.closing_time AS closingTime,
        u.username AS createdBy
      FROM branches b
      LEFT JOIN users u ON b.created_by = u.user_id
      ORDER BY b.created_by DESC
    `);

    res.status(200).json({ branches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllBranches = async (req, res) => {
  try {
    const [branches] = await db.query(
      `SELECT branch_id, branch_name FROM branches ORDER BY branch_name ASC`
    );
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch branches" });
  }
};
