import { Masthead } from "@/components/Masthead";
import { foundingState } from "@/ledger/state";
import { getSql } from "@/db/sqltype";
import { STATUS_LINE } from "@/legal/documents";

export const dynamic = "force-dynamic";

async function counts(): Promise<{ entries: number | null; withdrawn: number | null }> {
  try {
    const rows = await getSql().unsafe<{ entry_count: number; withdrawn_count: number }[]>(
      "SELECT entry_count, withdrawn_count FROM public.system_status",
    );
    return { entries: rows[0]?.entry_count ?? null, withdrawn: rows[0]?.withdrawn_count ?? null };
  } catch {
    return { entries: null, withdrawn: null };
  }
}

export default async function StatusPage() {
  const [state, c] = await Promise.all([foundingState(), counts()]);
  const modeLabel =
    state.ledgerState === "OPEN" && state.canAcceptEntries
      ? "OPEN FOR ENTRY"
      : state.ledgerState === "PAUSED"
        ? "PAUSED - INCIDENT STATE"
        : "CLOSED";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to status
      </a>
      <Masthead formationStatus={"STATUS · " + modeLabel} />
      <main id="main">
        <section className="page-shell" aria-labelledby="status-title">
          <p className="eyebrow">SERVICE + LEDGER STATUS</p>
          <h1
            id="status-title"
            style={{
              fontSize: "clamp(34px, 5.5vw, 78px)",
              letterSpacing: "-0.058em",
              lineHeight: 0.94,
            }}
          >
            The current truth.
          </h1>
          <dl className="status-grid" style={{ marginTop: 40 }}>
            <div
              className={state.ledgerState === "PAUSED" ? "status-cell mode-paused" : "status-cell"}
            >
              <dt>LEDGER WRITE STATE</dt>
              <dd>{modeLabel}</dd>
            </div>
            <div className="status-cell">
              <dt>RECORDED ENTRIES</dt>
              <dd>{c.entries === null ? "UNAVAILABLE" : String(c.entries)}</dd>
            </div>
            <div className="status-cell">
              <dt>WITHDRAWN PLACES</dt>
              <dd>{c.withdrawn === null ? "UNAVAILABLE" : String(c.withdrawn)}</dd>
            </div>
          </dl>
          <p className="status-note">
            {STATUS_LINE}. A Founding Ledger entry is not a share, security, token or legal
            membership. Withdrawn places keep their ordinal forever as tombstones; numbers are never
            reassigned.
          </p>
          <p className="status-note">
            ENVIRONMENT WRITE GATE: {state.canAcceptEntries ? "PRESENT" : "ABSENT"} · DATABASE MODE:{" "}
            {state.ledgerState} · BOTH MUST AGREE BEFORE ANY ENTRY CAN SEAL.
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <strong>OURS TODAY</strong>
          <span>26 AUGUST 2026</span>
        </div>
        <p>
          THIS PAGE REPORTS THE REAL STATE OF THIS ENVIRONMENT. IT NEVER CLAIMS MEMBERSHIP OR
          OWNERSHIP.
        </p>
        <a href="/">BACK TO THE INSTRUMENT ↑</a>
      </footer>
    </>
  );
}
