import { Masthead } from "@/components/Masthead";
import { foundingState } from "@/ledger/state";
import { readGates, type GateSummary } from "@/ledger/gates";
import { listConformanceRuns, type ConformanceRunRow } from "@/ledger/conformance";
import { listAnchors, type AnchorRow } from "@/ledger/anchor";
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

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function ago(date: Date): string {
  const days = daysSince(date);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return days + " days ago";
}

export default async function StatusPage() {
  // Every panel degrades independently: a status page that 500s because one
  // projection is unavailable is the opposite of a status page.
  const [state, c, gates, runs, anchors] = await Promise.all([
    foundingState(),
    counts(),
    readGates().catch((): GateSummary | null => null),
    listConformanceRuns(5).catch((): ConformanceRunRow[] => []),
    listAnchors(5).catch((): AnchorRow[] => []),
  ]);

  const modeLabel =
    state.ledgerState === "OPEN" && state.canAcceptEntries
      ? "OPEN FOR ENTRY"
      : state.ledgerState === "PAUSED"
        ? "PAUSED - INCIDENT STATE"
        : "CLOSED";

  const lastRun = runs[0];
  const lastAnchor = anchors[0];

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

        {/* The most honest page on the internet is the one whose primary
            content is what is not yet true about itself. */}
        <section className="gates ink-section" id="gates" aria-labelledby="gates-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow signal-text">MEMBERSHIP ISSUANCE · LIVE</p>
              <h2 id="gates-title">What is not yet true about us.</h2>
            </div>
            <p className="protocol-note">
              The Founding Ledger stays closed until every one of these is evidenced. When one
              slips, this page says so before anyone asks.
            </p>
          </div>

          {gates === null ? (
            <p className="neutral-note">GATE STATE UNAVAILABLE IN THIS ENVIRONMENT.</p>
          ) : (
            <>
              <dl className="gate-summary">
                <div>
                  <dt>GATES MET</dt>
                  <dd>
                    {gates.met} OF {gates.total}
                  </dd>
                </div>
                <div>
                  <dt>OLDEST OPEN GATE</dt>
                  <dd>{gates.oldestOpen ? gates.oldestOpen.title : "NONE"}</dd>
                </div>
                <div>
                  <dt>BLOCKED BY</dt>
                  <dd>{gates.oldestOpen?.blockedBy ?? "WORK IN PROGRESS"}</dd>
                </div>
                <div>
                  <dt>SLIPPED</dt>
                  <dd>{gates.slipped}</dd>
                </div>
              </dl>

              <ol className="gate-list" aria-label="Canonical launch gates">
                {gates.gates.map((gate) => (
                  <li key={gate.key} data-state={gate.state}>
                    <b>{String(gate.position).padStart(2, "0")}</b>
                    <div>
                      <strong>{gate.title}</strong>
                      <span>{gate.evidenceRequired}</span>
                      {gate.blockedBy ? <em>BLOCKED BY: {gate.blockedBy}</em> : null}
                    </div>
                    <span className="gate-state">
                      {gate.state === "MET" && gate.evidenceUri ? (
                        <a href={gate.evidenceUri}>MET ↗</a>
                      ) : (
                        gate.state.replace("_", " ")
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <section className="page-shell" aria-labelledby="conformance-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">CONFORMANCE · PUBLISHED EITHER WAY</p>
              <h2 id="conformance-title">We publish our own failures.</h2>
            </div>
            <p className="protocol-note">
              The invariant suite runs against the real database and appends its result to the
              canonical log. There is no flag that hides a failing run.
            </p>
          </div>

          {lastRun === undefined ? (
            <p className="neutral-note">
              NO CONFORMANCE RUN HAS BEEN RECORDED IN THIS ENVIRONMENT.
            </p>
          ) : (
            <>
              <dl className="status-grid">
                <div className={lastRun.passed ? "status-cell" : "status-cell mode-paused"}>
                  <dt>LAST RUN</dt>
                  <dd>{lastRun.passed ? "PASS" : "FAIL"}</dd>
                </div>
                <div className="status-cell">
                  <dt>WHEN</dt>
                  <dd>{ago(lastRun.ranAt)}</dd>
                </div>
                <div className="status-cell">
                  <dt>CHECKS FAILED</dt>
                  <dd>{lastRun.failedChecks}</dd>
                </div>
              </dl>
              <ol className="event-list" aria-label="Conformance checks">
                {lastRun.checks.map((check) => (
                  <li key={check.id}>
                    <time>{check.passed ? "PASS" : "FAIL"}</time>
                    <div>
                      <strong>{check.claim}</strong>
                      <span>{check.detail}</span>
                    </div>
                    <b>{check.id}</b>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <section className="page-shell" aria-labelledby="anchor-status-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">ANCHORS</p>
              <h2 id="anchor-status-title">The record outside this database.</h2>
            </div>
            <a className="document-link" href="/anchors">
              VERIFY AN ANCHOR <span aria-hidden="true">↗</span>
            </a>
          </div>
          {lastAnchor === undefined ? (
            <p className="neutral-note">
              NO ANCHOR PUBLISHED YET. AN ARCHIVE STARTED IN YEAR THREE IS A MARKETING ARTIFACT;
              STARTED IN MONTH ONE IT IS A RECORD.
            </p>
          ) : (
            <dl className="status-grid">
              <div className="status-cell">
                <dt>LATEST ROOT</dt>
                <dd style={{ fontSize: 13, wordBreak: "break-all" }}>{lastAnchor.merkleRoot}</dd>
              </div>
              <div className="status-cell">
                <dt>PERIOD</dt>
                <dd>
                  {lastAnchor.periodKind} {lastAnchor.periodLabel}
                </dd>
              </div>
              <div className="status-cell">
                <dt>DEPOSITED OUTSIDE OURS</dt>
                <dd>
                  {Array.isArray(lastAnchor.locations) && lastAnchor.locations.length > 0
                    ? String(lastAnchor.locations.length) + " LOCATION(S)"
                    : "NOT YET"}
                </dd>
              </div>
            </dl>
          )}
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
