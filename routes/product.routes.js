
import { Router } from "express";

import { verifyAuth } from "../middleware/verifyAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

import {
  createProduct,
  getAllProducts,
  getAdminProducts,
  getSingleProduct,
  getAdminSingleProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

// Get all active products
router.get("/", getAllProducts);

// Get single active product
router.get("/:id", getSingleProduct);

// ========================================
// ADMIN ROUTES
// ========================================

// Get all products for Admin
router.get(
  "/admin/all",
  verifyAuth,
  requireAdmin,
  getAdminProducts
);

// Get single product for Admin
router.get(
  "/admin/:id",
  verifyAuth,
  requireAdmin,
  getAdminSingleProduct
);

// Create product
router.post(
  "/",
  verifyAuth,
  requireAdmin,
  createProduct
);

// Update product
router.patch(
  "/:id",
  verifyAuth,
  requireAdmin,
  updateProduct
);

// Delete product
router.delete(
  "/:id",
  verifyAuth,
  requireAdmin,
  deleteProduct
);

export default router;
