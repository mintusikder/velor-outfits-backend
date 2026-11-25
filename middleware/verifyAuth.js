import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/auth.js";

export async function verifyAuth(req, res, next) {
  try {
    // TEMPORARY DEBUG LOGS
    console.log("\n========== AUTH DEBUG ==========");
    console.log("Route:", req.method, req.originalUrl);
    console.log("Cookie received:", Boolean(req.headers.cookie));

    // Check Better Auth session
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    console.log("Session found:", Boolean(sessionData));
    console.log("User found:", Boolean(sessionData?.user));
    console.log("User ID:", sessionData?.user?.id || "No user");
    console.log("================================\n");

    // No valid session
    if (!sessionData || !sessionData.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    // Attach authenticated user to request
    req.user = sessionData.user;
    req.session = sessionData.session;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
    });
  }
}