import { Router } from "express";
import { db } from "@workspace/db";
import { dealersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;

    const [items, [totalResult]] = await Promise.all([
      db.select().from(dealersTable).limit(limit).offset(offset).orderBy(sql`${dealersTable.createdAt} DESC`),
      db.select({ count: count() }).from(dealersTable),
    ]);

    res.json({
      items: items.map((d) => ({
        ...d,
        creditLimit: Number(d.creditLimit ?? 0),
        outstandingBalance: Number(d.outstandingBalance ?? 0),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dealers" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, contactPerson, phone, email, city, state, gstNumber, creditLimit, commissionSlab } = req.body;
    const dealerCode = `DLR-${Date.now().toString().slice(-6)}`;

    const [dealer] = await db.insert(dealersTable).values({
      dealerCode,
      name,
      contactPerson,
      phone,
      email,
      city,
      state,
      gstNumber,
      creditLimit: String(creditLimit ?? 0),
      commissionSlab,
    }).returning();

    res.status(201).json({
      ...dealer,
      creditLimit: Number(dealer.creditLimit ?? 0),
      outstandingBalance: Number(dealer.outstandingBalance ?? 0),
      createdAt: dealer.createdAt.toISOString(),
      updatedAt: dealer.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create dealer" });
  }
});

// PATCH /dealers/:id — update dealer
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, contactPerson, phone, email, city, state, gstNumber, creditLimit, outstandingBalance, commissionSlab } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (contactPerson !== undefined) updates.contactPerson = contactPerson;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (gstNumber !== undefined) updates.gstNumber = gstNumber;
    if (creditLimit !== undefined) updates.creditLimit = String(creditLimit);
    if (outstandingBalance !== undefined) updates.outstandingBalance = String(outstandingBalance);
    if (commissionSlab !== undefined) updates.commissionSlab = commissionSlab;

    const [dealer] = await db.update(dealersTable).set(updates).where(eq(dealersTable.id, id)).returning();
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    res.json({
      ...dealer,
      creditLimit: Number(dealer.creditLimit ?? 0),
      outstandingBalance: Number(dealer.outstandingBalance ?? 0),
      createdAt: dealer.createdAt.toISOString(),
      updatedAt: dealer.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update dealer" });
  }
});

// DELETE /dealers/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [dealer] = await db.select().from(dealersTable).where(eq(dealersTable.id, id));
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    await db.delete(dealersTable).where(eq(dealersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete dealer" });
  }
});

export default router;
