import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);

  const token = authHeader?.split(" ")[1];
  console.log("Token:", token);

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    if (![2].includes(decoded.role_id)) {
      return res.status(403).json({ error: "Admin access only" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.log("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
