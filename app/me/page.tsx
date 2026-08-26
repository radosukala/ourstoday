import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getAuth } from "@/auth/auth";
import { getPersonByAuthUserId } from "@/lib/person";
import { getSql, toDate, type DbTimestamp } from "@/db/sqltype";
import { Masthead } from "@/components/Masthead";
import { MeActions } from "./MeActions";
import { STATUS_LINE } from "@/legal/documents";

export const dynamic = "force-dynamic";

interface EntryInfo {
  ordinalLabel: string;
  displayName: string | null;
  publicStatus: string;
  relayState: string;
}

export default async function MePage() {
  const jar = await cookies();
  const headers = new Headers();
  const raw = jar.toString();
  if (raw) headers.set("cookie", raw);
  const session = await getAuth()
    .api.getSession({ headers })
    .catch(() => null);
  if (!session?.user?.id) redirect("/enter");

  const person = await getPersonByAuthUserId(session.user.id);

  let entry: EntryInfo | null = null;
  let requests: { kind: string; state: string; at: string; detail: string }[] = [];
  if (person) {
    try {
      const rows = await getSql().unsafe<
        {
          ordinal: number;
          display_name: string | null;
          public_status: string;
          relay_state: string;
        }[]
      >(
        "SELECT ordinal, display_name, public_status, relay_state FROM public.founding_ledger WHERE ordinal IN (SELECT ordinal FROM ledger.entry WHERE person_id = $1 AND lifecycle <> 'VOIDED')",
        [person.id],
      );
      if (rows[0]) {
        entry = {
          ordinalLabel: String(rows[0].ordinal).padStart(6, "0"),
          displayName: rows[0].display_name,
          publicStatus: rows[0].public_status,
          relayState: rows[0].relay_state,
        };
      }
      const wd = await getSql().unsafe<
        { reason_code: string; state: string; requested_at: DbTimestamp }[]
      >(
        "SELECT reason_code, state, requested_at FROM private.withdrawal_request WHERE person_id = $1 ORDER BY requested_at DESC LIMIT 5",
        [person.id],
      );
      const cr = await getSql().unsafe<
        { proposed_display_name: string; state: string; requested_at: DbTimestamp }[]
      >(
        "SELECT proposed_display_name, state, requested_at FROM private.correction_request WHERE person_id = $1 ORDER BY requested_at DESC LIMIT 5",
        [person.id],
      );
      requests = [
        ...wd.map((r) => ({
          kind: "WITHDRAWAL (" + r.reason_code + ")",
          state: r.state,
          at: toDate(r.requested_at).toISOString(),
          detail: "",
        })),
        ...cr.map((r) => ({
          kind: "CORRECTION → " + r.proposed_display_name,
          state: r.state,
          at: toDate(r.requested_at).toISOString(),
          detail: "",
        })),
      ];
    } catch {
      entry = null;
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to your account
      </a>
      <Masthead formationStatus="YOUR ACCOUNT · PRIVATE" />
      <main id="main">
        <section className="page-shell" aria-labelledby="me-title">
          <p className="eyebrow">PRIVATE ACCOUNT AREA</p>
          <h1
            id="me-title"
            style={{
              fontSize: "clamp(34px, 5.5vw, 72px)",
              letterSpacing: "-0.058em",
              lineHeight: 0.95,
            }}
          >
            Your records, your controls.
          </h1>

          <div className="me-columns">
            <div>
              <section className="me-section" aria-labelledby="me-account">
                <h2 id="me-account">Account</h2>
                <div className="receipt-block on-paper" style={{ marginTop: 16 }}>
                  <div className="receipt-line">
                    <dt>EMAIL ON FILE</dt>
                    <dd>{maskEmail(session.user.email)}</dd>
                  </div>
                  <div className="receipt-line">
                    <dt>EMAIL VERIFIED</dt>
                    <dd>{session.user.emailVerified ? "YES" : "PENDING"}</dd>
                  </div>
                  <div className="receipt-line">
                    <dt>LEDGER ENTRY</dt>
                    <dd>
                      {entry
                        ? "#" + entry.ordinalLabel + " · " + entry.publicStatus
                        : "NONE SEALED"}
                    </dd>
                  </div>
                </div>
                {!entry && (
                  <p className="neutral-note">
                    YOU HAVE NOT SEALED AN ENTRY. AUTHENTICATION ALONE NEVER CREATES ONE.{" "}
                    <Link href="/enter/continue">CONTINUE ENTRY</Link>.
                  </p>
                )}
              </section>

              <section className="me-section" aria-labelledby="me-rights">
                <h2 id="me-rights">Your rights</h2>
                <MeActions />
              </section>
            </div>

            <div>
              <section className="me-section" aria-labelledby="me-requests">
                <h2 id="me-requests">Open request history</h2>
                <ul className="request-list">
                  {requests.length === 0 ? (
                    <li>NO REQUESTS ON FILE</li>
                  ) : (
                    requests.map((r, i) => (
                      <li key={i}>
                        <span>{r.kind}</span>
                        <span className={"tag " + (r.state === "REQUESTED" ? "signal" : "")}>
                          {r.state}
                        </span>
                        <span>{r.at.slice(0, 10)}</span>
                      </li>
                    ))
                  )}
                </ul>
                <p className="neutral-note">
                  REVIEWS ARE PERFORMED BY A HUMAN STEWARD. CORRECTIONS AND WITHDRAWALS APPEND
                  EVENTS; ORDINALS ARE NEVER REASSIGNED. RETENTION AND ERASURE SCHEDULES AWAIT
                  LICENSED REVIEW.
                </p>
              </section>

              <section className="me-section" aria-labelledby="me-export">
                <h2 id="me-export">Export</h2>
                <p className="neutral-note">A COMPLETE, DOCUMENTED JSON EXPORT OF YOUR RECORDS.</p>
                <a className="small-button" href="/api/v1/me/export" style={{ marginTop: 12 }}>
                  DOWNLOAD MY EXPORT
                </a>
              </section>

              <section className="me-section" aria-labelledby="me-sessions">
                <h2 id="me-sessions">Sessions</h2>
                <MeActions.RevokeAll />
              </section>
            </div>
          </div>

          <p className="status-note">{STATUS_LINE}</p>
        </section>
      </main>
    </>
  );
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return email;
  return email.slice(0, 1) + "***" + email.slice(at);
}
