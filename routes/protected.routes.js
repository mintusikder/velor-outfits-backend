
import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

// Authenticated user test
router.get("/me", verifyAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authentication successful!",
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || "user",
    },
  });
});

// Admin-only test
router.get("/admin-test", verifyAuth, requireAdmin, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin access granted!",
    admin: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
