import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { OutboundEmail, EmailDeliveryResult } from "./types";

/**
 * Test-only email capture adapter. Writes the full email (including any
 * magic URL) to a local, gitignored directory. This directory is the ONLY
 * place reusable magic URLs may exist outside Better Auth storage.
 * Nothing is printed to logs.
 */
export async function captureEmail(
  email: OutboundEmail,
  captureDir: string,
): Promise<EmailDeliveryResult> {
  await mkdir(captureDir, { recursive: true });
  const id = `${Date.now()}-${randomBytes(6).toString("hex")}.json`;
  const record = {
    capturedAt: new Date().toISOString(),
    ...email,
  };
  await writeFile(path.join(captureDir, id), JSON.stringify(record, null, 2), "utf8");
  return { provider: "capture", id };
}
