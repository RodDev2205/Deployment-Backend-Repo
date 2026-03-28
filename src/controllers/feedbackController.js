import { db } from '../config/db.js';
import supabase from '../config/supabaseClient.js';

export const createFeedback = async (req, res) => {
  try {
    const { user_id, type, message, details } = req.body;

    if (!user_id || !type || !message) {
      return res.status(400).json({
        error: 'user_id, type, and message are required',
      });
    }

    const [rows] = await db.execute(
      'SELECT user_id, first_name, role_id, branch_id FROM users WHERE user_id = ?',
      [user_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];

    const { data, error } = await supabase.from('feedback').insert([
      {
        user_id: user.user_id,
        name: user.first_name,
        role: user.role_id,
        branch: user.branch_id,
        type,
        message,
        details: details || null,
        status: 'open',
        source: 'client',
      },
    ]);

    if (error) {
      console.error('Supabase insert error', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: 'Feedback saved', data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
