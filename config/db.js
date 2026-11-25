
const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB() {
  try {
    // Environment variables
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "velor_outfits";

    // Check MongoDB URI
    if (!uri) {
      throw new Error("MONGODB_URI is missing in .env file");
    }

    // Create MongoDB client
    if (!client) {
      client = new MongoClient(uri);
    }

    // Connect to MongoDB
    await client.connect();

    // Select database
    db = client.db(dbName);

    // Test database connection
    await db.command({ ping: 1 });

    console.log("✅ MongoDB connected successfully!");
    console.log(`📦 Database: ${db.databaseName}`);

    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
}

// Get database instance
function getDB() {
  if (!db) {
    throw new Error("Database is not connected yet!");
  }

  return db;
}

// Export functions
module.exports = {
  connectDB,
  getDB,
};
