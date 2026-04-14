import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

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
    const { name, email, role } = req.body;
    const [user] = await db.insert(usersTable).values({ name, email, role }).returning();

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
    const { name, email, role, isActive } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

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

export default router;
