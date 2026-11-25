
import "dotenv/config";

import express from "express";
import cors from "cors";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth.js";

import { connectDB, getDB } from "./config/db.js";
import { initializeProductIndexes } from "./config/productIndexes.js";

// API Routes
import protectedRoutes from "./routes/protected.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// CORS CONFIGURATION
// ========================================
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ========================================
// BETTER AUTH HANDLER
// ========================================
// Express 5 catch-all route
app.all("/api/auth/*splat", toNodeHandler(auth));

// ========================================
// BODY PARSER
// ========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// HOME ROUTE
// ========================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to VELOR OUTFITS API",
    version: "1.0.0",
  });
});

// ========================================
// HEALTH CHECK
// ========================================
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// MONGODB TEST
// ========================================
app.get("/api/v1/test-db", async (req, res, next) => {
  try {
    const db = getDB();

    await db.command({ ping: 1 });

    res.status(200).json({
      success: true,
      message: "MongoDB connected successfully",
      database: db.databaseName,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// PROTECTED API ROUTES
// ========================================
// Authentication and Admin authorization
app.use("/api/v1/protected", protectedRoutes);

// ========================================
// USER PROFILE ROUTES
// ========================================
// Get Profile and Update Profile
app.use("/api/v1/users", userRoutes);

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
app.use((error, req, res, next) => {
  console.error("❌ Server Error:", error.message);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
});

// ========================================
// START SERVER
// ========================================
async function startServer() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Initialize Product Indexes
    await initializeProductIndexes();

    // 3. Start Express Server
    app.listen(PORT, () => {
      console.log("-----------------------------------");
      console.log("VELOR OUTFITS BACKEND");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`Database: http://localhost:${PORT}/api/v1/test-db`);
      console.log(`Auth: http://localhost:${PORT}/api/auth`);
      console.log(`Protected: http://localhost:${PORT}/api/v1/protected`);
      console.log(`Users: http://localhost:${PORT}/api/v1/users`);
      console.log(`Products: http://localhost:${PORT}/api/v1/products`);
      console.log("-----------------------------------");
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
