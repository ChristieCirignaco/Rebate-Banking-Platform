import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Relative import (not the @/ alias) so this runs under tsx / `prisma db seed`.
import { hashPassword } from "../lib/password";

// Idempotent admin bootstrap. Configure with ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
// (safe defaults for local dev). Creates or updates an admin user with a Better Auth
// "credential" account whose password is argon2id-hashed to match lib/auth.ts's
// verifier, so the seeded admin can sign in immediately.
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@rebate.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.ADMIN_NAME ?? "Admin";
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "admin", emailVerified: true },
    create: { id: randomUUID(), email, name, role: "admin", emailVerified: true },
  });

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });
  }

  console.info(`Seeded admin: ${email} (role=admin)`);
  if (!process.env.ADMIN_PASSWORD) {
    console.info(`Default password: ${password} — set ADMIN_PASSWORD to override.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
