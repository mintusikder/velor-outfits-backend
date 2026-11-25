import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { auth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { getDB } from "../config/db.js";

const router = express.Router();

/**
 * GET MY PROFILE
 * GET /api/v1/users/me
 * Login required
 */
router.get("/me", verifyAuth, async (req, res, next) => {
  try {
    const db = getDB();

    const profile = await db.collection("userProfiles").findOne({
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        image: req.user.image || null,
        role: req.user.role || "user",
        phone: profile?.phone || "",
        address: profile?.address || "",
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * UPDATE MY PROFILE
 * PATCH /api/v1/users/me
 * Login required
 */
router.patch("/me", verifyAuth, async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;

    // 1. Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide profile information to update.",
      });
    }

    // 2. Only allow these fields to be updated
    const allowedFields = ["name", "phone", "address"];

    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fields provided.",
        invalidFields,
      });
    }

    // 3. Validate name
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters long.",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 100 characters.",
        });
      }
    }

    // 4. Validate phone
    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.trim().length > 30) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number.",
        });
      }
    }

    // 5. Validate address
    if (address !== undefined) {
      if (typeof address !== "string" || address.trim().length > 500) {
        return res.status(400).json({
          success: false,
          message: "Address must be a valid string (maximum 500 characters).",
        });
      }
    }

    // 6. Update name through Better Auth
    let updatedName = req.user.name;

    if (name !== undefined) {
      const result = await auth.api.updateUser({
        body: {
          name: name.trim(),
        },
        headers: fromNodeHeaders(req.headers),
      });

      updatedName = result.user?.name || name.trim();
    }

    // 7. Save custom profile information in MongoDB
    const db = getDB();

    const profileUpdate = {};

    if (phone !== undefined) {
      profileUpdate.phone = phone.trim();
    }

    if (address !== undefined) {
      profileUpdate.address = address.trim();
    }

    if (Object.keys(profileUpdate).length > 0) {
      await db.collection("userProfiles").updateOne(
        { userId: req.user.id },
        {
          $set: {
            ...profileUpdate,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            userId: req.user.id,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // 8. Fetch updated profile
    const profile = await db.collection("userProfiles").findOne({
      userId: req.user.id,
    });

    // 9. Send response
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: req.user.id,
        name: updatedName,
        email: req.user.email,
        image: req.user.image || null,
        role: req.user.role || "user",
        phone: profile?.phone || "",
        address: profile?.address || "",
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;