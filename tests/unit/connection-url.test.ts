import { describe, expect, it } from "vitest";
import { normalizeConnectionUrl } from "@/db/connection-url";

describe("connection URL normalization", () => {
  it("strips libpq client-side parameters that PostgreSQL would refuse", () => {
    // Neon hands out exactly this. postgres.js forwards unknown query params
    // as STARTUP parameters, and the server answers
    // `unrecognized configuration parameter "channel_binding"`.
    const n = normalizeConnectionUrl(
      "postgresql://USER:PASSWORD@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    );
    expect(n.connectionString).not.toContain("channel_binding");
    expect(n.connectionString).not.toContain("sslmode");
    expect(n.ssl).toBe("require");
  });

  it("honours the URL's own sslmode instead of overriding it", () => {
    expect(normalizeConnectionUrl("postgresql://h.example.com/db?sslmode=disable").ssl).toBe(false);
    expect(normalizeConnectionUrl("postgresql://h.example.com/db?sslmode=prefer").ssl).toBe(
      "prefer",
    );
    expect(normalizeConnectionUrl("postgresql://h.example.com/db?sslmode=require").ssl).toBe(
      "require",
    );
    // postgres.js has no CA-only mode; verifying a chain while ignoring the
    // hostname is a distinction without a security benefit.
    expect(normalizeConnectionUrl("postgresql://h.example.com/db?sslmode=verify-ca").ssl).toBe(
      "verify-full",
    );
    expect(normalizeConnectionUrl("postgresql://h.example.com/db?sslmode=verify-full").ssl).toBe(
      "verify-full",
    );
  });

  it("requires TLS for a remote host that names no sslmode, and not for local", () => {
    expect(normalizeConnectionUrl("postgresql://db.example.com/x").ssl).toBe("require");
    expect(normalizeConnectionUrl("postgresql://127.0.0.1:5432/x").ssl).toBe(false);
    expect(normalizeConnectionUrl("postgresql://localhost:5432/x").ssl).toBe(false);
  });

  it("detects transaction poolers, where named prepared statements do not survive", () => {
    const neon = normalizeConnectionUrl("postgresql://USER:PASSWORD@ep-x-pooler.aws.neon.tech/db");
    expect(neon.isTransactionPooler).toBe(true);
    const neonDirect = normalizeConnectionUrl("postgresql://USER:PASSWORD@ep-x.aws.neon.tech/db");
    expect(neonDirect.isTransactionPooler).toBe(false);
    expect(
      normalizeConnectionUrl(
        "postgresql://USER:PASSWORD@aws-0-eu.pooler.supabase.com:6543/postgres",
      ).isTransactionPooler,
    ).toBe(true);
    expect(normalizeConnectionUrl("postgresql://127.0.0.1:5432/x").isTransactionPooler).toBe(false);
  });

  it("passes a non-URL connection form through untouched", () => {
    const n = normalizeConnectionUrl("/var/run/postgresql");
    expect(n.connectionString).toBe("/var/run/postgresql");
    expect(n.ssl).toBe(false);
    expect(n.isLocal).toBe(true);
  });

  it("keeps real server parameters", () => {
    // application_name and options ARE server settings and must survive.
    const n = normalizeConnectionUrl(
      "postgresql://h.example.com/db?sslmode=require&application_name=ours&options=-c%20statement_timeout%3D5s",
    );
    expect(n.connectionString).toContain("application_name=ours");
    expect(n.connectionString).toContain("options=");
  });
});
