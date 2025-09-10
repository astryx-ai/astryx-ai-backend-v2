import { Request, Response } from "express";
import { z } from "zod";
import * as ResponseHelper from "../utils/responseHelper";
import { claimInviteCode, getInviteCode } from "../db/queries/inviteCodes";
import { updateUserData } from "../db/queries/users";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

const verifySchema = z.object({
  code: z.string().min(1),
});

export const verifyInviteCodeController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  if (!userId) {
    return ResponseHelper.notAuthorized(res, "Unauthorized");
  }

  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return ResponseHelper.badRequest(
      res,
      parsed.error.errors,
      "Invalid payload"
    );
  }
  const { code } = parsed.data;

  // Check code presence and validity
  const existing = await getInviteCode(code);
  if (!existing) {
    // Mark user metadata flag as false
    await updateUserData(userId, {
      rawUserMetaData: { invite_verified: false },
    });
    return ResponseHelper.badRequest(
      res,
      null,
      "Invalid or expired invite code"
    );
  }

  // Attempt to claim (atomically increments used_count if still valid)
  const claimed = await claimInviteCode(code);
  if (!claimed) {
    await updateUserData(userId, {
      rawUserMetaData: { invite_verified: false },
    });
    return ResponseHelper.badRequest(res, null, "Invite code not available");
  }

  // Update user metadata to set invite_verified true
  const updatedUser = await updateUserData(userId, {
    rawUserMetaData: { invite_verified: true },
  });

  return ResponseHelper.success(
    res,
    {
      invite_verified: true,
    },
    "Invite code verified"
  );
};
