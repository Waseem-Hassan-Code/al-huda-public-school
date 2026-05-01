import { prisma } from "./prisma";

/**
 * Well-known nil UUID used as the identity for all automated/system operations
 * (cron jobs, auto-generated vouchers, etc.).  Using a fixed UUID means the
 * row can be upserted safely across restarts and keeps audit logs coherent.
 */
export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// Module-level flag so we only hit the DB once per server process.
let _ensured = false;

/**
 * Returns the system user's UUID, creating the User record if it does not yet
 * exist.  Safe to call concurrently — `upsert` on the primary key is atomic.
 */
export async function getSystemUserId(): Promise<string> {
  if (_ensured) return SYSTEM_USER_ID;

  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {},          // already exists — nothing to change
    create: {
      id: SYSTEM_USER_ID,
      email: "system@al-huda.internal",
      username: "system",
      name: "System (Automated)",
      // Random hex string — cannot be used to log in (not a valid bcrypt hash)
      password: "SYSTEM_NO_LOGIN_" + Math.random().toString(36).slice(2),
      role: "ADMIN",
      isActive: false,   // prevent login through the UI
      isSeeded: true,
    },
  });

  _ensured = true;
  return SYSTEM_USER_ID;
}
