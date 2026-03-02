import { db } from "../config/db.js";

/**
 * Auto-create chat room for a branch if it doesn't exist
 * Add all admins + superadmins of that branch to the chat room
 */
export const ensureChatRoomExists = async (branch_id) => {
  try {
    // Check if room already exists
    const [rooms] = await db.execute(
      "SELECT room_id, room_name FROM chat_rooms WHERE branch_id = ? AND room_type = 'branch'",
      [branch_id]
    );

    let room_id;
    if (rooms.length === 0) {
      // Get branch name
      const [branches] = await db.execute(
        "SELECT branch_name FROM branches WHERE branch_id = ?",
        [branch_id]
      );
      const room_name = branches[0]
        ? `${branches[0].branch_name} Chat Room`
        : `Branch ${branch_id} Chat Room`;

      // Create room
      const [result] = await db.execute(
        "INSERT INTO chat_rooms (room_name, room_type, branch_id) VALUES (?, 'branch', ?)",
        [room_name, branch_id]
      );
      room_id = result.insertId;
      console.log(`✅ Created chat room ${room_id} (${room_name})`);
    } else {
      room_id = rooms[0].room_id;
    }

    // Add users to room
    const [users] = await db.execute(
      `SELECT user_id FROM users 
       WHERE (
         (role_id = 2 AND branch_id = ?) OR 
         (role_id = 3)
       ) 
       AND status = 'Activate'`,
      [branch_id]
    );

    for (const user of users) {
      const [existing] = await db.execute(
        "SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?",
        [room_id, user.user_id]
      );
      if (existing.length === 0) {
        await db.execute(
          "INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)",
          [room_id, user.user_id]
        );
        console.log(`✅ Added user ${user.user_id} to chat room ${room_id}`);
      }
    }

    return room_id;
  } catch (err) {
    console.error("Error in ensureChatRoomExists:", err.message);
    throw err;
  }
};

/**
 * Get last 50 messages for a branch room
 */
export const getBranchMessages = async (req, res) => {
  const { branch_id } = req.params;
  const user_id = req.user.user_id;
  const role_id = req.user.role_id;
  const user_branch_id = req.user.branch_id;

  try {
    // Only admins (role_id 2) restricted to their branch
    if (role_id === 2 && user_branch_id !== parseInt(branch_id)) {
      return res.status(403).json({ message: "Access denied: You can only access your assigned branch" });
    }

    const room_id = await ensureChatRoomExists(branch_id);

    const [rows] = await db.execute(
      `SELECT 
         m.message_id, 
         m.room_id,
         m.sender_id, 
         u.full_name, 
         u.username, 
         m.message,
         m.message_type,
         m.attachment_url,
         m.attachment_name,
         m.created_at,
         COALESCE(ms.status, 'sent') as message_status
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       LEFT JOIN message_status ms ON ms.message_id = m.message_id AND ms.user_id = ?
       WHERE m.room_id = ?
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [user_id, room_id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all branches with last message (for sidebar)
 */
export const getBranchesWithLastMessage = async (req, res) => {
  const user_id = req.user.user_id;
  const role_id = req.user.role_id;
  const user_branch_id = req.user.branch_id;

  try {
    let branches;
    if (role_id === 3) {
      // Superadmin sees all branches
      const [allBranches] = await db.execute(
        `SELECT branch_id, branch_name FROM branches ORDER BY branch_name`
      );
      branches = allBranches;
    } else if (role_id === 2) {
      // Admin sees only their branch
      const [adminBranch] = await db.execute(
        `SELECT branch_id, branch_name FROM branches WHERE branch_id = ?`,
        [user_branch_id]
      );
      branches = adminBranch;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    // Ensure rooms exist
    for (const branch of branches) {
      await ensureChatRoomExists(branch.branch_id);
    }

    // Get last message for each branch
    const branchesWithMessages = await Promise.all(
      branches.map(async (branch) => {
        const [lastMsg] = await db.execute(
          `SELECT m.message_id, m.sender_id, u.full_name, u.username, m.message, m.message_type, m.created_at
           FROM messages m
           JOIN users u ON u.user_id = m.sender_id
           JOIN chat_rooms r ON r.room_id = m.room_id
           WHERE r.branch_id = ? AND r.room_type = 'branch'
           ORDER BY m.created_at DESC
           LIMIT 1`,
          [branch.branch_id]
        );

        const last = lastMsg[0] || null;
        const displayMessage = last 
          ? (last.message_type === 'image' ? '📷 Image' : last.message_type === 'file' ? '📎 File' : last.message)
          : "No messages yet";

        return {
          branch_id: branch.branch_id,
          branch_name: branch.branch_name,
          lastMessage: displayMessage,
          lastTime: last ? new Date(last.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          sender_name: last ? last.full_name || last.username : null,
          room_id: last ? last.message_id : null,
        };
      })
    );

    res.json(branchesWithMessages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
