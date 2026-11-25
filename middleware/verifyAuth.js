
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/auth.js";

export async function verifyAuth(req, res, next) {
  try {
    // Get session from Better Auth using request headers
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

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

    // Continue to protected route
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
    });
  }
}
