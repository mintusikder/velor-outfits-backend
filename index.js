
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { connectDB, getDB } = require("./config/db");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// 1. MIDDLEWARE
// ========================================

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Parse JSON data
app.use(express.json());

// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// ========================================
// 2. ROOT ROUTE
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to VELOR OUTFITS API",
    version: "1.0.0",
  });
});

// ========================================
// 3. HEALTH CHECK ROUTE
// ========================================

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// 4. DATABASE TEST ROUTE
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
// 5. 404 NOT FOUND HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// ========================================
// 6. GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error("Server Error:", error.message);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
});

// ========================================
// 7. START SERVER
// ========================================

async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log("-----------------------------------");
      console.log("VELOR OUTFITS BACKEND");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`Database: http://localhost:${PORT}/api/v1/test-db`);
      console.log("-----------------------------------");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

// Run server
startServer();
