
import { MongoClient } from "mongodb";

let client;
let db;
let connectionPromise;

export async function connectDB() {
  if (db) return db;
  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "velor_outfits";

  if (!uri) {
    throw new Error("MONGODB_URI is missing in .env file");
  }

  client = new MongoClient(uri);

  connectionPromise = client
    .connect()
    .then(async (connectedClient) => {
      db = connectedClient.db(dbName);

      await db.command({ ping: 1 });

      console.log("✅ MongoDB connected successfully!");
      console.log(`📦 Database: ${db.databaseName}`);

      return db;
    })
    .catch((error) => {
      connectionPromise = null;
      client = null;
      db = null;

      console.error(
        "❌ MongoDB connection failed:",
        error.message
      );

      throw error;
    });

  return connectionPromise;
}

export function getDB() {
  if (!db) {
    throw new Error("Database is not connected yet!");
  }

  return db;
}

// Better Auth adapter-এর জন্য MongoClient
export function getMongoClient() {
  if (!client) {
    throw new Error("MongoDB client is not connected yet!");
  }

  return client;
}
