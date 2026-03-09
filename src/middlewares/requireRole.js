export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.user.role_id) {
      console.error("requireRole - role_id is missing from req.user:", req.user);
      return res.status(403).json({ error: "Access denied: invalid user role" });
    }

    if (!allowedRoles.includes(req.user.role_id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
};
