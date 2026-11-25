
import "dotenv/config";

import express from "express";
import cors from "cors";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth.js";

import { connectDB, getDB } from "./config/db.js";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Better Auth handler
// Express 5 catch-all route
app.all("/api/auth/*splat", toNodeHandler(auth));

// Body parser (Better Auth route-এর পরে)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to VELOR OUTFITS API",
    version: "1.0.0",
  });
});

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
  });
});

// MongoDB test
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("❌ Server Error:", error.message);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
});

// Start server
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("-----------------------------------");
      console.log("VELOR OUTFITS BACKEND");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`Database: http://localhost:${PORT}/api/v1/test-db`);
      console.log(`Auth: http://localhost:${PORT}/api/auth`);
      console.log("-----------------------------------");
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
