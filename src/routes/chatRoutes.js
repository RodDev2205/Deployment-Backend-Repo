import express from "express";
import multer from "multer";
import path from "path";
import { getBranchMessages, getBranchesWithLastMessage } from "../controllers/chatController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

// multer for chat attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const router = express.Router();

// Get all branches with last message (for admin/superadmin)
router.get(
  "/branches-with-messages",
  verifyToken,
  requireRole(2, 3), // admin or superadmin
  getBranchesWithLastMessage
);

// upload attachment
router.post(
  "/upload",
  verifyToken,
  requireRole(2, 3),
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const mime = req.file.mimetype || "";
    const type = mime.startsWith("image/") ? "image" : "file";
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, message_type: type, attachment_name: req.file.originalname });
  }
);

// Get last 50 messages for a specific branch
router.get(
  "/branch/:branch_id",
  verifyToken,
  requireRole(2, 3),
  getBranchMessages
);

export default router;
