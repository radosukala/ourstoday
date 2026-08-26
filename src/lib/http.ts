import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export interface ApiError {
  state: string;
  message: string;
}

export function jsonOk<T extends object>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ status: "OK", ...body }, init);
}

export function jsonError(state: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { status: "ERROR", state, message } satisfies { status: string } & ApiError,
    { status },
  );
}

/** Neutral response used where revealing existence would enable enumeration. */
export function jsonNeutral(): NextResponse {
  return NextResponse.json({
    status: "OK",
    state: "DELIVERY_ATTEMPTED",
    message: "If this address can receive sign-in links, one is on its way.",
  });
}

export function randomId(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString("base64url");
}

export function sha256HexOf(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
