
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { admin } from "better-auth/plugins";

import { connectDB, getMongoClient } from "../config/db.js";

// MongoDB connected না থাকলে আগে connect করব
const db = await connectDB();
const client = getMongoClient();

export const auth = betterAuth({
  // Better Auth secret
  secret: process.env.BETTER_AUTH_SECRET,

  // Backend URL
  baseURL: process.env.BETTER_AUTH_URL,

  // Frontend allowed origin
  trustedOrigins: [
    process.env.CLIENT_URL || "http://localhost:3000",
  ],

  // MongoDB Database
  database: mongodbAdapter(db, {
    client,
  }),

  // Email & Password Authentication
  emailAndPassword: {
    enabled: true,
  },

  // Admin Plugin
  plugins: [
    admin({
      // সকল নতুন user-এর default role
      defaultRole: "user",

      // এই role-টি Admin হিসেবে গণ্য হবে
      adminRoles: ["admin"],
    }),
  ],
});
