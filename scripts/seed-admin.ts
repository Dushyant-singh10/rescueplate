import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db, pool } = await import("../db");
  const { users } = await import("../db/schema");
  const bcrypt = (await import("bcryptjs")).default;
  const { eq } = await import("drizzle-orm");

  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] ?? "Admin";

  if (!email || !password) {
    console.error("Usage: npm run db:seed-admin -- <email> <password> [name]");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ role: "admin", passwordHash, name })
      .where(eq(users.id, existing.id));
    console.log(`Updated existing user ${normalizedEmail} to admin`);
  } else {
    await db.insert(users).values({
      email: normalizedEmail,
      passwordHash,
      name,
      role: "admin",
      orgId: null,
    });
    console.log(`Created admin user ${normalizedEmail}`);
  }

  await pool.end();
}

main();
