import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SALT_ROUNDS = 12;

router.get("/", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLogin: u.lastLogin?.toISOString(),
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    // Hash the password if provided, otherwise set a default
    const rawPassword = password || "Adhams@2026";
    const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const [user] = await db
      .insert(usersTable)
      .values({ name, email, role, passwordHash })
      .returning();

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin?.toISOString(),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PATCH /users/:id — update user
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, role, isActive, password } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    // If a new password is provided, hash it
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    updates.updatedAt = new Date();

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin?.toISOString(),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /users/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// POST /users/:id/reset-password — admin can reset any user's password
router.post("/:id/reset-password", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body;
    const rawPassword = newPassword || "Adhams@2026";
    const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const [user] = await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
