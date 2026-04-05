import { db } from "../config/db.js";

export const createBranch = async (req, res) => {
      console.log("DEBUG: req.user =", req.user); // 🔥 Add this line

  try {
    const {
      branchName,
      contact,
      openingTime,
      closingTime,
      locationId
    } = req.body;

    if (!branchName || !contact || !openingTime || !closingTime || !locationId) {
      return res.status(400).json({ message: "All fields are required, including location" });
    }

    const [locationColumn] = await db.query(
      "SHOW COLUMNS FROM branches LIKE 'location_id'"
    );

    let insertQuery;
    let params;

    if (locationColumn.length > 0) {
      insertQuery = `
      INSERT INTO branches
      (branch_name, contact_number, opening_time, closing_time, location_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [
        branchName,
        contact,
        openingTime,
        closingTime,
        locationId,
        req.user.user_id // comes from JWT
      ];
    } else {
      return res.status(400).json({ message: "Location support not available in database" });
    }

    const [result] = await db.query(insertQuery, params);

    res.status(201).json({
      message: "Branch created successfully",
      branchId: result.insertId,
      branch: {
        branch_id: result.insertId,
        name: branchName,
        contact,
        openingTime,
        closingTime,
        locationId: locationId
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

export const createLocation = async (req, res) => {
  try {
    const { country, city, province, street, postal_code } = req.body;

    if (!country || !city || !province || !street || !postal_code) {
      return res.status(400).json({ message: "All location fields are required." });
    }

    const [result] = await db.query(
      `INSERT INTO locations (country, city, province, street, postal_code) VALUES (?, ?, ?, ?, ?)`,
      [country.trim(), city.trim(), province.trim(), street.trim(), postal_code.trim()]
    );

    const newLocation = {
      location_id: result.insertId,
      country: country.trim(),
      city: city.trim(),
      province: province.trim(),
      street: street.trim(),
      postal_code: postal_code.trim(),
    };

    res.status(201).json({ message: "Location added successfully", location: newLocation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create location" });
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
      contact,
      openingTime,
      closingTime,
      locationId
    } = req.body;

    if (!branchName || !contact || !openingTime || !closingTime || !locationId) {
      return res.status(400).json({ message: "All fields are required, including location" });
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
        contact_number = ?,
        opening_time = ?,
        closing_time = ?,
        location_id = ?
       WHERE branch_id = ?`,
      [branchName, contact, openingTime, closingTime, locationId, id]
    );

    res.status(200).json({
      message: "Branch updated successfully",
      branch: {
        branch_id: id,
        name: branchName,
        contact,
        openingTime,
        closingTime,
        locationId
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
