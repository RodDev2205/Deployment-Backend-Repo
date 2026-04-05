import { db } from "../config/db.js";

export const createBranch = async (req, res) => {
  try {
    const {
      branchName,
      openingTime,
      closingTime,
      locationId
    } = req.body;

    if (!branchName || !openingTime || !closingTime || !locationId) {
      return res.status(400).json({ message: "All fields are required, including location" });
    }

    const [locationColumn] = await db.query(
      "SHOW COLUMNS FROM branches LIKE 'location_id'"
    );

    let insertQuery;
    let params;

    if (locationColumn.length > 0) {
      const address = "";
      insertQuery = `
      INSERT INTO branches
      (branch_name, address, opening_time, closing_time, location_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [
        branchName,
        address,
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
        b.opening_time AS openingTime,
        b.closing_time AS closingTime,
        b.status,
        b.location_id AS locationId,
        b.contact_person_id AS contactPersonId,
        CONCAT_WS(', ', l.street, l.city, l.province, l.country, l.postal_code) AS locationText,
        u.username AS createdBy,
        cp.user_id AS contactPersonUserId,
        cp.first_name AS contactPersonFirstName,
        cp.last_name AS contactPersonLastName,
        cp.username AS contactPersonUsername,
        cp.contact_number AS contactPersonContactNumber
      FROM branches b
      LEFT JOIN locations l ON b.location_id = l.location_id
      LEFT JOIN users u ON b.created_by = u.user_id
      LEFT JOIN users cp ON b.contact_person_id = cp.user_id
      ORDER BY b.created_by DESC
    `
      : `
      SELECT 
        b.branch_id, 
        b.branch_name AS name,
        b.address, 
        b.opening_time AS openingTime,
        b.closing_time AS closingTime,
        b.status,
        b.contact_person_id AS contactPersonId,
        u.username AS createdBy,
        cp.user_id AS contactPersonUserId,
        cp.first_name AS contactPersonFirstName,
        cp.last_name AS contactPersonLastName,
        cp.username AS contactPersonUsername,
        cp.contact_number AS contactPersonContactNumber
      FROM branches b
      LEFT JOIN users u ON b.created_by = u.user_id
      LEFT JOIN users cp ON b.contact_person_id = cp.user_id
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
      openingTime,
      closingTime,
      locationId,
      contactPersonId
    } = req.body;

    if (!branchName || !openingTime || !closingTime || !locationId) {
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
        opening_time = ?,
        closing_time = ?,
        location_id = ?,
        contact_person_id = ?
       WHERE branch_id = ?`,
      [branchName, openingTime, closingTime, locationId, contactPersonId || null, id]
    );

    res.status(200).json({
      message: "Branch updated successfully",
      branch: {
        branch_id: id,
        name: branchName,
        openingTime,
        closingTime,
        locationId,
        contactPersonId
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBranchAdmins = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({ message: "Branch ID is required" });
    }

    // Get all admins (role_id = 2) for the specific branch
    const [admins] = await db.query(
      `SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        u.username,
        u.contact_number,
        u.status
      FROM users u
      WHERE u.branch_id = ? AND u.role_id = 2 AND u.status = 'Activate'
      ORDER BY u.first_name ASC, u.last_name ASC`,
      [branchId]
    );

    res.status(200).json({ admins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
