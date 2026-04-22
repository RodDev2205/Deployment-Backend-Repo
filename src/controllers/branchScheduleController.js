import db from '../config/db.js';

/**
 * Create or update branch operating period
 */
export const setBranchOperatingPeriod = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.body;

    if (!branchId || !startDate) {
      return res.status(400).json({ error: 'Branch ID and start date are required' });
    }

    // Check if operating period already exists
    const [existing] = await db.execute(
      'SELECT branch_op_id FROM branch_operating_period WHERE branch_id = ?',
      [branchId]
    );

    if (existing.length > 0) {
      // Update existing
      await db.execute(
        'UPDATE branch_operating_period SET start_date = ?, end_date = ? WHERE branch_id = ?',
        [startDate, endDate || null, branchId]
      );
    } else {
      // Insert new
      await db.execute(
        'INSERT INTO branch_operating_period (branch_id, start_date, end_date) VALUES (?, ?, ?)',
        [branchId, startDate, endDate || null]
      );
    }

    res.status(200).json({ message: 'Operating period set successfully' });
  } catch (error) {
    console.error('Set operating period error:', error);
    res.status(500).json({ error: 'Failed to set operating period' });
  }
};

/**
 * Get branch operating period
 */
export const getBranchOperatingPeriod = async (req, res) => {
  try {
    const { branchId } = req.params;

    const [rows] = await db.execute(
      'SELECT * FROM branch_operating_period WHERE branch_id = ?',
      [branchId]
    );

    res.status(200).json(rows[0] || null);
  } catch (error) {
    console.error('Get operating period error:', error);
    res.status(500).json({ error: 'Failed to retrieve operating period' });
  }
};

/**
 * Set weekly schedule for a branch
 */
export const setBranchWeeklySchedule = async (req, res) => {
  try {
    const { branchId, schedules } = req.body;

    if (!branchId || !Array.isArray(schedules)) {
      return res.status(400).json({ error: 'Branch ID and schedules array are required' });
    }

    // Delete existing schedules for this branch
    await db.execute('DELETE FROM branch_schedule WHERE branch_id = ?', [branchId]);

    // Insert new schedules
    for (const schedule of schedules) {
      const { dayOfWeek, openTime, closeTime, isClosed } = schedule;

      if (!dayOfWeek) continue;

      await db.execute(
        'INSERT INTO branch_schedule (branch_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)',
        [branchId, dayOfWeek, openTime || null, closeTime || null, isClosed ? 1 : 0]
      );
    }

    res.status(200).json({ message: 'Weekly schedule set successfully' });
  } catch (error) {
    console.error('Set weekly schedule error:', error);
    res.status(500).json({ error: 'Failed to set weekly schedule' });
  }
};

/**
 * Get branch weekly schedule
 */
export const getBranchWeeklySchedule = async (req, res) => {
  try {
    const { branchId } = req.params;

    const [rows] = await db.execute(
      `SELECT schedule_id, day_of_week, open_time, close_time, is_closed
       FROM branch_schedule 
       WHERE branch_id = ? 
       ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
      [branchId]
    );

    res.status(200).json(rows || []);
  } catch (error) {
    console.error('Get weekly schedule error:', error);
    res.status(500).json({ error: 'Failed to retrieve weekly schedule' });
  }
};

/**
 * Add special closure period
 */
export const addBranchClosure = async (req, res) => {
  try {
    const { branchId, startDate, endDate, reason } = req.body;

    if (!branchId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Branch ID, start date, and end date are required' });
    }

    const [result] = await db.execute(
      'INSERT INTO branch_closures (branch_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
      [branchId, startDate, endDate, reason || null]
    );

    res.status(201).json({ 
      message: 'Closure period added successfully',
      closureId: result.insertId 
    });
  } catch (error) {
    console.error('Add closure error:', error);
    res.status(500).json({ error: 'Failed to add closure period' });
  }
};

/**
 * Get branch closures
 */
export const getBranchClosures = async (req, res) => {
  try {
    const { branchId } = req.params;

    const [rows] = await db.execute(
      `SELECT closure_id, start_date, end_date, reason
       FROM branch_closures 
       WHERE branch_id = ? 
       ORDER BY start_date DESC`,
      [branchId]
    );

    res.status(200).json(rows || []);
  } catch (error) {
    console.error('Get closures error:', error);
    res.status(500).json({ error: 'Failed to retrieve closures' });
  }
};

/**
 * Delete a closure period
 */
export const deleteBranchClosure = async (req, res) => {
  try {
    const { closureId } = req.params;

    await db.execute('DELETE FROM branch_closures WHERE closure_id = ?', [closureId]);

    res.status(200).json({ message: 'Closure period deleted successfully' });
  } catch (error) {
    console.error('Delete closure error:', error);
    res.status(500).json({ error: 'Failed to delete closure period' });
  }
};

/**
 * Check if a branch is currently open
 * Returns: { isOpen: boolean, reason: string, currentTime: string, dayOfWeek: string }
 */
export const checkBranchStatus = async (req, res) => {
  try {
    const { branchId } = req.params;
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = daysOfWeek[now.getDay()];

    // Check if branch exists and is active
    const [branch] = await db.execute(
      'SELECT status FROM branches WHERE branch_id = ?',
      [branchId]
    );

    if (!branch || branch.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    if (branch[0].status === 'deactivate') {
      return res.status(200).json({ 
        isOpen: false, 
        reason: 'Branch is deactivated',
        currentTime,
        dayOfWeek,
        currentDate
      });
    }

    // Check if there's an active closure for today
    const [closure] = await db.execute(
      `SELECT closure_id FROM branch_closures 
       WHERE branch_id = ? AND start_date <= ? AND end_date >= ?`,
      [branchId, currentDate, currentDate]
    );

    if (closure && closure.length > 0) {
      return res.status(200).json({ 
        isOpen: false, 
        reason: 'Branch is closed for special closure',
        currentTime,
        dayOfWeek,
        currentDate
      });
    }

    // Check if branch is within operating period
    const [operatingPeriod] = await db.execute(
      `SELECT start_date, end_date FROM branch_operating_period 
       WHERE branch_id = ?`,
      [branchId]
    );

    if (operatingPeriod && operatingPeriod.length > 0) {
      const { start_date, end_date } = operatingPeriod[0];
      if (currentDate < start_date || (end_date && currentDate > end_date)) {
        return res.status(200).json({ 
          isOpen: false, 
          reason: 'Outside operating period',
          currentTime,
          dayOfWeek,
          currentDate,
          operatingPeriod: { start_date, end_date }
        });
      }
    }

    // Check daily schedule
    const [schedule] = await db.execute(
      `SELECT open_time, close_time, is_closed FROM branch_schedule 
       WHERE branch_id = ? AND day_of_week = ?`,
      [branchId, dayOfWeek]
    );

    if (!schedule || schedule.length === 0) {
      // No schedule defined, assume closed
      return res.status(200).json({ 
        isOpen: false, 
        reason: 'No schedule defined for this day',
        currentTime,
        dayOfWeek,
        currentDate
      });
    }

    const { open_time, close_time, is_closed } = schedule[0];

    if (is_closed) {
      return res.status(200).json({ 
        isOpen: false, 
        reason: 'Closed on ' + dayOfWeek,
        currentTime,
        dayOfWeek,
        currentDate
      });
    }

    if (!open_time || !close_time) {
      return res.status(200).json({ 
        isOpen: false, 
        reason: 'No operating hours defined for this day',
        currentTime,
        dayOfWeek,
        currentDate
      });
    }

    // Check if current time is within operating hours
    const isOpen = currentTime >= open_time && currentTime < close_time;

    res.status(200).json({ 
      isOpen,
      reason: isOpen ? 'Open' : `Closed (Hours: ${open_time} - ${close_time})`,
      currentTime,
      dayOfWeek,
      currentDate,
      schedule: { open_time, close_time }
    });

  } catch (error) {
    console.error('Check branch status error:', error);
    res.status(500).json({ error: 'Failed to check branch status' });
  }
};

/**
 * Get full branch schedule information (for display)
 */
export const getBranchScheduleInfo = async (req, res) => {
  try {
    const { branchId } = req.params;

    // Get operating period
    const [operatingPeriod] = await db.execute(
      'SELECT start_date, end_date FROM branch_operating_period WHERE branch_id = ?',
      [branchId]
    );

    // Get weekly schedule
    const [weeklySchedule] = await db.execute(
      `SELECT schedule_id, day_of_week, open_time, close_time, is_closed
       FROM branch_schedule 
       WHERE branch_id = ? 
       ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
      [branchId]
    );

    // Get closures
    const [closures] = await db.execute(
      `SELECT closure_id, start_date, end_date, reason
       FROM branch_closures 
       WHERE branch_id = ? 
       ORDER BY start_date DESC`,
      [branchId]
    );

    res.status(200).json({
      operatingPeriod: operatingPeriod[0] || null,
      weeklySchedule: weeklySchedule || [],
      closures: closures || []
    });
  } catch (error) {
    console.error('Get schedule info error:', error);
    res.status(500).json({ error: 'Failed to retrieve schedule information' });
  }
};
