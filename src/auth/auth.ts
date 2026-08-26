import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { config } from "@/config";
import { getDb } from "@/db/client";
import * as authSchema from "@/db/schema/auth";
import {
  buildConfirmationUrl,
  deliverMagicLinkEmail,
  MAGIC_LINK_EXPIRY_MINUTES,
} from "@/email/magic-link";

/**
 * Better Auth owns sessions and authentication tables. The ONLY public
 * mechanism is the email magic link. Following it proves control of an email
 * address - never personhood, and never a ledger entry.
 *
 * sendMagicLink receives the raw token directly and rebuilds it into an
 * OURS-owned confirmation URL with the token in the fragment, so emailed GETs
 * can never authenticate or consume anything.
 */
export interface MagicLinkMetadata {
  ctxId?: string;
}

export type Auth = ReturnType<typeof createAuth>;

let cached: Auth | undefined;

/** Lazily construct the singleton auth instance inside request scope only. */
export function getAuth(): Auth {
  if (!cached) cached = createAuth();
  return cached;
}

function createAuth() {
  const cfg = config();
  return betterAuth({
    appName: "OURS TODAY",
    baseURL: process.env.BETTER_AUTH_URL ?? cfg.appUrl,
    trustedOrigins: (() => {
      const origins = [cfg.appUrl];
      if (cfg.appEnv !== "production") {
        origins.push("http://localhost:3000", "http://127.0.0.1:3000");
      }
      return origins;
    })(),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: authSchema.user,
        session: authSchema.session,
        account: authSchema.account,
        verification: authSchema.verification,
        // Required by rateLimit.storage = "database" below; without it every
        // authenticated request throws inside the adapter.
        rateLimit: authSchema.rateLimit,
      },
    }),
    emailAndPassword: { enabled: false },
    advanced: {
      /**
       * Without a resolvable client IP, Better Auth falls back to ONE shared
       * per-path bucket - a global rate limit, which protects nobody in
       * particular. Naming the platform header makes the limit per-caller.
       *
       * Consequence, decided deliberately: Better Auth also stores this
       * address on the session row. See DATA-MAP.md risk 1 and the privacy
       * notice; the retention schedule for it is still an open decision.
       */
      ipAddress: {
        ipAddressHeaders: cfg.trustedIpHeaders,
      },
      useSecureCookies: cfg.appEnv === "production",
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: cfg.appEnv === "production",
        path: "/",
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_EXPIRY_MINUTES * 60,
        storeToken: "hashed",
        rateLimit: { window: 15 * 60, max: 8 },
        sendMagicLink: async ({ email, token, metadata }) => {
          const meta = (metadata ?? {}) as MagicLinkMetadata;
          await deliverMagicLinkEmail(email, buildConfirmationUrl(token, meta.ctxId));
        },
      }),
      nextCookies(),
    ],
  });
}
