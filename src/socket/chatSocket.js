import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import { ensureChatRoomExists } from "../controllers/chatController.js";

export default (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { user_id, role_id, branch_id }
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("✅ Authenticated user connected:", socket.user.user_id, "Role:", socket.user.role_id);

    // Join branch room
    socket.on("joinBranchRoom", async ({ branch_id }) => {
      try {
        if (![2, 3].includes(socket.user.role_id)) {
          return socket.emit("error", "Access denied");
        }
        if (socket.user.role_id === 2 && socket.user.branch_id !== branch_id) {
          return socket.emit("error", "Access denied: You can only access your assigned branch");
        }

        const room_id = await ensureChatRoomExists(branch_id);

        const [rows] = await db.execute(
          "SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?",
          [room_id, socket.user.user_id]
        );

        if (!rows.length) {
          await db.execute(
            "INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)",
            [room_id, socket.user.user_id]
          );
        }

        socket.room_id = room_id;
        socket.branch_id = branch_id;
        socket.join(`branch_${branch_id}`);

        io.to(`branch_${branch_id}`).emit("userJoined", {
          user_id: socket.user.user_id,
          message: "User joined the chat",
        });
      } catch (err) {
        socket.emit("error", err.message);
      }
    });

    // Send message (supports text or attachment)
    socket.on("sendMessage", async ({ branch_id, message = '', message_type = 'text', attachment_url = null, attachment_name = null }) => {
      try {
        // require either text or attachment
        if (!message.trim() && !attachment_url) return;
        if (socket.user.role_id === 2 && socket.user.branch_id !== branch_id) {
          return socket.emit("error", "Access denied: You can only send messages to your branch");
        }

        const sender_id = socket.user.user_id;

        const [senderRows] = await db.execute(
          "SELECT full_name, username FROM users WHERE user_id = ?",
          [sender_id]
        );

        const senderName = senderRows[0]?.full_name || senderRows[0]?.username || "Unknown";

        const room_id = await ensureChatRoomExists(branch_id);

        const [result] = await db.execute(
          "INSERT INTO messages (room_id, sender_id, message, message_type, attachment_url, attachment_name) VALUES (?, ?, ?, ?, ?, ?)",
          [room_id, sender_id, message, message_type, attachment_url, attachment_name]
        );

        const message_id = result.insertId;

        const [members] = await db.execute(
          "SELECT user_id FROM chat_room_members WHERE room_id = ?",
          [room_id]
        );

        for (const member of members) {
          await db.execute(
            "INSERT IGNORE INTO message_status (message_id, user_id, status) VALUES (?, ?, 'delivered')",
            [message_id, member.user_id]
          );
        }

        io.to(`branch_${branch_id}`).emit("receiveMessage", {
          branch_id,
          message_id,
          sender_id,
          full_name: senderName,
          username: senderRows[0]?.username || "Unknown",
          message,
          message_type,
          attachment_url,
          attachment_name,
          created_at: new Date().toISOString(),
          message_status: 'delivered',
        });

      } catch (err) {
        socket.emit("error", err.message);
      }
    });

    // Mark seen
    socket.on("markMessageSeen", async ({ message_id }) => {
      try {
        await db.execute(
          "UPDATE message_status SET status = 'seen' WHERE message_id = ? AND user_id = ?",
          [message_id, socket.user.user_id]
        );

        if (socket.branch_id) {
          io.to(`branch_${socket.branch_id}`).emit("messageSeen", {
            message_id,
            user_id: socket.user.user_id,
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", () => {
      if (socket.branch_id) {
        io.to(`branch_${socket.branch_id}`).emit("userLeft", {
          user_id: socket.user.user_id,
          message: "User left the chat",
        });
      }
    });
  });
};
