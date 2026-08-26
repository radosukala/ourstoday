import { z } from "zod";

/** Trim and case-normalize BEFORE validating the address format. */
export const emailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.email().max(320));

export const displayNameSchema = z
  .string()
  .min(2)
  .max(40)
  .refine((v) => !/[\p{Cc}\p{Cf}]/u.test(v), "Control characters are not allowed");

export const documentVersionsSchema = z.object({
  declaration: z.string().min(3).max(80),
  constitution: z.string().min(3).max(80),
  protocol: z.string().min(3).max(80),
  privacyNotice: z.string().min(3).max(80),
  legalStatus: z.string().min(3).max(80),
});

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    "Allowed characters: letters, digits, dot, underscore, colon, hyphen",
  );

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});

export const magicLinkConfirmSchema = z.object({
  token: z.string().min(10).max(512),
  ctxId: z.string().min(10).max(200).optional(),
});

export const sealRequestSchema = z.object({
  displayName: displayNameSchema,
  acceptedVersions: documentVersionsSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const correctionRequestSchema = z.object({
  proposedDisplayName: displayNameSchema,
  reasonDetail: z.string().max(1000).optional(),
  idempotencyKey: idempotencyKeySchema,
});

export const withdrawalRequestSchema = z.object({
  reasonCode: z.enum(["PERSONAL_CHOICE", "PRIVACY_CONCERN", "DUPLICATE", "OTHER"]),
  reasonDetail: z.string().max(1000).optional(),
  idempotencyKey: idempotencyKeySchema,
});

export const relayIssueSchema = z.object({
  channelHint: z.enum(["x", "linkedin", "direct", "web", "unknown"]).default("direct"),
});
