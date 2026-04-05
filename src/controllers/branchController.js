import { db } from "../config/db.js";

export const createBranch = async (req, res) => {
      console.log("DEBUG: req.user =", req.user); // 🔥 Add this line

  try {
    const {
      branchName,
      address,
      contact,
      openingTime,
      closingTime,
      locationId
    } = req.body;

    if (!branchName || !address || !contact || !openingTime || !closingTime) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [locationColumn] = await db.query(
      "SHOW COLUMNS FROM branches LIKE 'location_id'"
    );

    let insertQuery;
    let params;

    if (locationColumn.length > 0) {
      insertQuery = `
      INSERT INTO branches
      (branch_name, address, contact_number, opening_time, closing_time, location_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      params = [
        branchName,
        address,
        contact,
        openingTime,
        closingTime,
        locationId || null,
        req.user.user_id // comes from JWT
      ];
    } else {
      insertQuery = `
      INSERT INTO branches
      (branch_name, address, contact_number, opening_time, closing_time, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [
        branchName,
        address,
        contact,
        openingTime,
        closingTime,
        req.user.user_id // comes from JWT
      ];
    }

    const [result] = await db.query(insertQuery, params);

    res.status(201).json({
      message: "Branch created successfully",
      branchId: result.insertId,
      branch: {
        branch_id: result.insertId,
        name: branchName,
        address,
        contact,
        openingTime,
        closingTime,
        locationId: locationId || null
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBranchLocations = async (req, res) => {
  try {
    const [locations] = await db.query(
      `SELECT location_id, country, city, province, street, postal_code FROM locations ORDER BY country ASC, city ASC, province ASC, street ASC`
    );

    res.status(200).json({ locations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

export const getBranches = async (req, res) => {
  try {
    const [locationColumn] = await db.query(
      "SHOW COLUMNS FROM branches LIKE 'location_id'"
    );

    const hasLocationId = locationColumn.length > 0;

    const query = hasLocationId
      ? `
      SELECT 
        b.branch_id, 
        b.branch_name AS name,
        b.address, 
        b.contact_number AS contact,
        b.opening_time AS openingTime,
        b.closing_time AS closingTime,
        b.status,
        b.location_id AS locationId,
        CONCAT_WS(', ', l.street, l.city, l.province, l.country, l.postal_code) AS locationText,
        u.username AS createdBy
      FROM branches b
      LEFT JOIN locations l ON b.location_id = l.location_id
      LEFT JOIN users u ON b.created_by = u.user_id
      ORDER BY b.created_by DESC
    `
      : `
      SELECT 
        b.branch_id, 
        b.branch_name AS name,
        b.address, 
        b.contact_number AS contact,
        b.opening_time AS openingTime,
        b.closing_time AS closingTime,
        b.status,
        u.username AS createdBy
      FROM branches b
      LEFT JOIN users u ON b.created_by = u.user_id
      ORDER BY b.created_by DESC
    `;

    const [branches] = await db.query(query);

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

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
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

    // Check if branch exists and user has permission (same branch or superadmin)
    const [existingBranch] = await db.query(
      'SELECT * FROM branches WHERE branch_id = ?',
      [id]
    );

    if (existingBranch.length === 0) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Update the branch
    await db.query(
      `UPDATE branches SET
        branch_name = ?,
        address = ?,
        contact_number = ?,
        opening_time = ?,
        closing_time = ?
       WHERE branch_id = ?`,
      [branchName, address, contact, openingTime, closingTime, id]
    );

    res.status(200).json({
      message: "Branch updated successfully",
      branch: {
        branch_id: id,
        name: branchName,
        address,
        contact,
        openingTime,
        closingTime
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
