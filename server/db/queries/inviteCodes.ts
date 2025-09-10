import { and, eq, gt, or, sql, isNull } from "drizzle-orm";
import { db } from "../index";
import { inviteCodes } from "../schema";

// Fetch an invite code by code string
export const getInviteCode = async (code: string) => {
  const rows = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code))
    .limit(1);
  return rows[0] || null;
};

// Atomically claim an invite code if valid (not expired and under max uses)
export const claimInviteCode = async (code: string) => {
  const now = new Date();
  const updated = await db
    .update(inviteCodes)
    .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
    .where(
      and(
        eq(inviteCodes.code, code),
        or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
        sql`${inviteCodes.usedCount} < ${inviteCodes.maxUses}`
      )
    )
    .returning();
  return updated[0] || null;
};
