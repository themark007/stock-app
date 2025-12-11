// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

/**
 * Main JWT protection middleware
 * - Requires "Authorization: Bearer <token>"
 * - Extracts user info from token
 * - Sets req.user = { id, email, username }
 */
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Require Bearer token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized (no token provided)" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("❌ JWT_SECRET missing in environment");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Verify token
    const payload = jwt.verify(token, secret);

    // Attach user to request
    req.user = {
      id: payload.id,
      email: payload.email,
      username: payload.username,
    };

    next();
  } catch (err) {
    console.error("❌ JWT Protect error:", err.message || err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * OPTIONAL:
 * allowFakeUserForTesting()
 *
 * Lets you test APIs in Postman *without* JWT by passing ?userId=<uuid>
 * ONLY used for development mode.
 *
 * To use it, wrap your route:
 *   router.get('/users/:userId/subscriptions', allowFakeUserForTesting, protect, controller)
 */
export const allowFakeUserForTesting = (req, res, next) => {
  if (process.env.NODE_ENV === "development" && !req.headers.authorization) {
    if (req.params.userId) {
      req.user = { id: req.params.userId };
      console.warn("⚠ Using UNAUTHENTICATED DEV MODE user:", req.user.id);
      return next();
    }
  }
  next();
};
