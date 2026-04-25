import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "adhams-erp-jwt-secret-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Find user by email (case-insensitive)
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.trim().toLowerCase()));

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Your account has been suspended. Contact your administrator." });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: "No password set for this account. Contact your administrator." });
      return;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Update lastLogin
    await db
      .update(usersTable)
      .set({ lastLogin: new Date() })
      .where(eq(usersTable.id, user.id));

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
// Validates the current JWT and returns the user info
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
      name: string;
      email: string;
    };

    // Fetch fresh user data from DB (role or active status may have changed)
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId));

    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account suspended" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      res.status(401).json({ error: "Session expired. Please login again." });
      return;
    }
    if (err?.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "Authentication check failed" });
  }
});

// ─── POST /auth/change-password ───────────────────────────────────────────────
router.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current password and new password are required" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId));

    if (!user || !user.passwordHash) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(usersTable.id, decoded.userId));

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err: any) {
    if (err?.name === "TokenExpiredError" || err?.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
