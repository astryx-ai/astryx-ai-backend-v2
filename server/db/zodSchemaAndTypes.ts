import { z } from "zod";
import {
  insertChatSchema,
  selectChatSchema,
  insertMessageSchema,
  selectMessageSchema,
  InsertChat,
  SelectChat,
  InsertMessage,
  SelectMessage,
} from "./schema";
import {
  insertInviteCodeSchema,
  selectInviteCodeSchema,
  InsertInviteCode,
  SelectInviteCode,
} from "./schema";

export const updateChatSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
});

// User onboarding data validation
export const updateUserDataSchema = z.object({
  phone: z.string().optional(),
  displayName: z.string().optional(),
  userMetadata: z.record(z.any()).optional(),
});

// Phone verification validation schemas
export const sendOTPSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(
      /^\+[1-9]\d{1,14}$/,
      "Phone number must include country code (e.g., +1234567890)"
    ),
});

export const verifyOTPSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(
      /^\+[1-9]\d{1,14}$/,
      "Phone number must include country code (e.g., +1234567890)"
    ),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

export {
  insertChatSchema,
  selectChatSchema,
  insertMessageSchema,
  selectMessageSchema,
  insertInviteCodeSchema,
  selectInviteCodeSchema,
};

export type { InsertChat, SelectChat, InsertMessage, SelectMessage };
export type { InsertInviteCode, SelectInviteCode };
