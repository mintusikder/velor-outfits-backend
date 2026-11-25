
export function requireAdmin(req, res, next) {
  try {
    // verifyAuth must run before requireAdmin
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Login required.",
      });
    }

    // Check admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Admin access required.",
      });
    }

    // Admin authorized
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify admin permission.",
    });
  }
}
