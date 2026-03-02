import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Auth Header received:", authHeader); // DEBUG

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded); 
    req.user = decoded; 
    // { user_id, role_id, branch_id }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
