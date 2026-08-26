
import { Masthead } from "@/components/Masthead";
import { ResponseActions } from "@/components/ResponseDialog";
import { listPublicEntries, type PublicEntry } from "@/ledger/queries";
import { foundingState } from "@/ledger/state";
import { LEGAL_MEMBERSHIP_STATUS, THESIS } from "@/legal/documents";

export const dynamic = "force-dynamic";

interface LedgerRow {
  ordinal: number;
  name: string;
  entered: Date | null;
  arrivedThrough: string;
  relayState: "OPEN" | "CONTINUED";
}

/** Declared origin row from the Day 1 instrument (genesis treatment is a recorded future decision). */
const DECLARED_ORIGIN_ROW: LedgerRow = {
  ordinal: 1,
  name: "RADO",
  entered: new Date("2026-08-26T00:00:00Z"),
  arrivedThrough: "ORIGIN",
  relayState: "OPEN",
};

function formatEntered(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return day + " " + months[date.getUTCMonth()] + " " + date.getUTCFullYear();
}

function LedgerRowView({ row }: { row: LedgerRow }) {
  return (
    <tr>
      <td><strong>{String(row.ordinal).padStart(6, "0")}</strong></td>
      <td>{row.name}</td>
      <td>{row.entered ? <time dateTime={row.entered.toISOString()}>{formatEntered(row.entered)}</time> : "-"}</td>
      <td>{row.arrivedThrough}</td>
      <td className={row.relayState === "OPEN" ? "relay-open" : ""}>
        <i aria-hidden="true"></i> {row.relayState}
      </td>
      <td>{LEGAL_MEMBERSHIP_STATUS}</td>
    </tr>
  );
}

async function loadLedgerRows(): Promise<{ rows: LedgerRow[]; live: boolean }> {
  try {
    const entries: PublicEntry[] = await listPublicEntries(100);
    if (entries.length === 0) return { rows: [DECLARED_ORIGIN_ROW], live: false };
    const rows = entries.map((entry) => ({
      ordinal: entry.ordinal,
      name:
        entry.displayName ??
        (entry.publicStatus === "WITHDRAWN" ? "[WITHDRAWN]" : "[UNAVAILABLE]"),
      entered: entry.enteredAt,
      arrivedThrough:
        entry.predecessorOrdinal !== null
          ? String(entry.predecessorOrdinal).padStart(6, "0")
          : entry.originKind === "DECLARED_ORIGIN"
            ? "ORIGIN"
            : "-",
      relayState: entry.relayState,
    }));
    return { rows, live: true };
  } catch {
    // Database unavailable or never migrated: show only the declared origin
    // and say so truthfully.
    return { rows: [DECLARED_ORIGIN_ROW], live: false };
  }
}

export default async function HomePage() {
  const [{ rows, live }, state] = await Promise.all([
    loadLedgerRows(),
    foundingState().catch(() => ({ ledgerState: "CLOSED" as const, canAcceptEntries: false })),
  ]);
  const formationStatus =
    state.canAcceptEntries ? "FORMING · OPEN FOR ENTRY" : live ? "FORMING · LEDGER CLOSED" : "FORMING · LOCAL BUILD";

  return (
    <>
      <a className="skip-link" href="#main">Skip to the founding instrument</a>
      <Masthead formationStatus={formationStatus} />

      <main id="main">
        <section className="founding-field" id="top" aria-labelledby="founding-statement">
          <p className="eyebrow">FOUNDING DECLARATION · VERSION 0.1</p>
          <h1 id="founding-statement">
            <span>THE NETWORK</span>
            <span>IS <em>OURS.</em></span>
            <span>EVERYTHING ELSE</span>
            <span>CAN BE BUILT.</span>
          </h1>
          <div className="thesis-strip">
            <p>{THESIS}</p>
            <dl>
              <div><dt>OWNERSHIP</dt><dd>COMMITTED</dd></div>
              <div><dt>LEGAL MEMBERSHIP</dt><dd>NOT YET ISSUED</dd></div>
              <div><dt>SOURCE STATUS</dt><dd>LOCAL · TEST BUILD</dd></div>
            </dl>
          </div>
        </section>

        <section className="ledger" id="ledger" aria-labelledby="ledger-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE FOUNDING LEDGER</p>
              <h2 id="ledger-title">One place. One relay. No audience required.</h2>
            </div>
            <p className="protocol-note">A successor activates the connection—not your right to belong.</p>
          </div>

          <div className="table-scroll">
            <table className="ledger-table">
              <caption className="sr-only">Founding Ledger record{live ? "" : " (declared origin; ledger not open)"}</caption>
              <thead>
                <tr>
                  <th scope="col">NO.</th>
                  <th scope="col">PERSON</th>
                  <th scope="col">ENTERED</th>
                  <th scope="col">ARRIVED THROUGH</th>
                  <th scope="col">RELAY</th>
                  <th scope="col">MEMBERSHIP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <LedgerRowView key={row.ordinal} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="next-place">
            <div>
              <span className="next-number">NEXT</span>
              <p>Your number is assigned only when a verified entry is sealed. Nothing is reserved. Nothing is sold.</p>
            </div>
            <a className="enter-button" href="/enter">ENTER THE FOUNDING LEDGER <span aria-hidden="true">↘</span></a>
          </div>
          {!live && (
            <p className="neutral-note">
              THE SHARED LEDGER IS NOT OPEN IN THIS ENVIRONMENT. THE ROW ABOVE IS THE DECLARED ORIGIN OF THE FORMATION STORY - NOT A CANONICAL DATABASE EVENT.
            </p>
          )}
        </section>

        <section className="entry-instrument ink-section" id="entry" aria-labelledby="entry-title">
          <div className="entry-copy">
            <p className="eyebrow signal-text">ENTRY INSTRUMENT · VERIFIED ENTRY</p>
            <h2 id="entry-title">Prepare your place. Seal when you decide.</h2>
            <p className="large-copy">
              Entry verifies your email, shows you exactly what you accept, and assigns a public number
              only inside one committed transaction. A Founding Ledger entry is not legal membership.
            </p>
            <ol className="relay-sequence" aria-label="Founding Relay sequence">
              <li><b>01</b><span>YOU ENTER</span></li>
              <li><b>02</b><span>YOUR RELAY OPENS</span></li>
              <li><b>03</b><span>ANOTHER HUMAN CONTINUES</span></li>
              <li><b>04</b><span>THE EDGE IS RECORDED</span></li>
            </ol>
          </div>

          <div className="entry-panel">
            <form action="/enter" method="get">
              <label className="field-label" htmlFor="enter-overview">WHAT ENTRY REQUIRES</label>
              <ol className="enter-steps">
                <li><b>01</b><span>Verify control of your email with a magic link.</span></li>
                <li><b>02</b><span>Choose a public name or pseudonym.</span></li>
                <li><b>03</b><span>Read and accept the declaration and current versions.</span></li>
                <li><b>04</b><span>Seal. The transaction assigns your number at commit.</span></li>
              </ol>
              <button className="action-button inverse" type="submit">BEGIN VERIFIED ENTRY <span aria-hidden="true">→</span></button>
              <p className="form-status" role="status">
                NO NUMBER IS RESERVED BY STARTING. MAGICAL LINKS AUTHENTICATE EMAIL ONLY.
              </p>
            </form>
          </div>
        </section>

        <section className="tapes" id="tapes" aria-labelledby="tapes-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">DAY 1 · CAUSAL RECORD</p>
              <h2 id="tapes-title">Watch why the network changes.</h2>
            </div>
            <p className="protocol-note">Not a raw terminal replay. Input, authority, change, test and result.</p>
          </div>

          <div className="tape-grid">
            <section className="tape-column" aria-labelledby="formation-tape-title">
              <header>
                <p className="eyebrow">01</p>
                <h3 id="formation-tape-title">FORMATION TAPE</h3>
              </header>
              <ol className="event-list">
                <li>
                  <time dateTime="2026-08-26">DAY 1</time>
                  <div><strong>FOUNDING THESIS ADOPTED</strong><span>Founder-steward project decision</span></div>
                  <b>RECORDED</b>
                </li>
                <li>
                  <time dateTime="2026-08-26">DAY 1</time>
                  <div><strong>CONSTITUTION 0.1 OPERATIVE</strong><span>Member ratification not yet possible</span></div>
                  <b>CHARTER</b>
                </li>
                <li>
                  <time dateTime="2026-08-26">DAY 1</time>
                  <div><strong>LEDGER APPLICATION BUILT LOCALLY</strong><span>Atomic seal, relays and rights paths under test</span></div>
                  <b>TEST BUILD</b>
                </li>
                <li className="event-open">
                  <time>OPEN</time>
                  <div><strong>CANONICAL LEDGER</strong><span>Blocked on verification, privacy, recovery and integrity gates</span></div>
                  <b>NOT LIVE</b>
                </li>
              </ol>
            </section>

            <section className="tape-column" aria-labelledby="build-tape-title">
              <header>
                <p className="eyebrow">02</p>
                <h3 id="build-tape-title">BUILD TAPE</h3>
              </header>
              <details open>
                <summary><span>D1.4</span> Static instrument becomes an application <b>SHIPPED LOCALLY</b></summary>
                <dl className="build-fields">
                  <div><dt>INPUT</dt><dd>A frontend preview cannot make participation honest by itself.</dd></div>
                  <div><dt>DECISION</dt><dd>Build the verified entry ritual on a real database.</dd></div>
                  <div><dt>CHANGE</dt><dd>Next.js application, PostgreSQL ledger, atomic seal, signed relays.</dd></div>
                  <div><dt>TRUTH</dt><dd>Local test build. Canonical writes stay closed until readiness receipt.</dd></div>
                </dl>
              </details>
              <details>
                <summary><span>D1.2</span> Reservation becomes an atomic seal <b>SPECIFIED → IMPLEMENTED</b></summary>
                <dl className="build-fields">
                  <div><dt>INPUT</dt><dd>A 15-minute reservation fails under viral concurrency.</dd></div>
                  <div><dt>DECISION</dt><dd>Assign at verified commit; the first successor activates only the edge.</dd></div>
                  <div><dt>CHANGE</dt><dd>Row-locked ordinal allocator plus atomic First Continuation race.</dd></div>
                  <div><dt>TRUTH</dt><dd>Implemented and concurrency-tested locally. Not deployed.</dd></div>
                </dl>
              </details>
              <details>
                <summary><span>D1.3</span> Social reach returns as evidence <b>SPECIFIED</b></summary>
                <dl className="build-fields">
                  <div><dt>INPUT</dt><dd>Discussion on X and LinkedIn can create reach, but the network needs the result.</dd></div>
                  <div><dt>DECISION</dt><dd>Outsource reach, never memory or authority.</dd></div>
                  <div><dt>CHANGE</dt><dd>Define canonical case files, structured responses and agent digests.</dd></div>
                  <div><dt>TRUTH</dt><dd>Specification shipped. External ingestion remains unbuilt.</dd></div>
                </dl>
              </details>
            </section>
          </div>
        </section>

        <section className="constitution ink-section" id="constitution" aria-labelledby="constitution-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow signal-text">CONSTITUTION DIFF · V0.1 → V0.2</p>
              <h2 id="constitution-title">The institution changed before the interface did.</h2>
            </div>
            <a className="document-link inverse-link" href="/source/CONSTITUTION-0.1.md">READ CONSTITUTION 0.1 <span aria-hidden="true">↗</span></a>
          </div>

          <div className="diff" aria-label="Founding direction change">
            <p className="removed"><span>−</span> The first public product is a Mission Market of cells.</p>
            <p className="added"><span>+</span> The first public product is the network forming itself in public.</p>
            <p className="removed"><span>−</span> Everything can be built. What should become ours?</p>
            <p className="added"><span>+</span> THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.</p>
            <p className="removed"><span>−</span> Public momentum leads the first experience.</p>
            <p className="added"><span>+</span> Chronology, causal participation and legal truth lead.</p>
            <p className="added"><span>+</span> Another person activates the edge—not your belonging.</p>
            <p className="added"><span>+</span> External networks distribute; OURS remembers and decides.</p>
          </div>

          <div className="constitution-status">
            <div><span>AUTHORITY</span><strong>FOUNDER-STEWARD ADOPTED</strong></div>
            <div><span>MEMBER RATIFICATION</span><strong>NOT YET POSSIBLE</strong></div>
            <div><span>LEGAL REVIEW</span><strong>REQUIRED BEFORE 1.0</strong></div>
          </div>
        </section>

        <section className="decision" id="decision" aria-labelledby="decision-title">
          <div className="case-number" aria-hidden="true">P–0001</div>
          <div className="case-main">
            <p className="eyebrow">NEXT DECISION · CONSTITUTIONAL SIGNAL</p>
            <h2 id="decision-title">When does the Founding Era end?</h2>
            <p className="large-copy">Proposed: when Constitution 1.0 is validly ratified—not when an arbitrary counter fills.</p>

            <div className="case-arguments">
              <div>
                <h3>CASE FOR</h3>
                <p>It turns founding status into a constitutional job, avoids artificial scarcity and lets low ledger numbers preserve chronology.</p>
              </div>
              <div>
                <h3>CASE AGAINST</h3>
                <p>Legal work could delay the end indefinitely, and people may enter under materially different drafts.</p>
              </div>
              <div>
                <h3>EVIDENCE MISSING</h3>
                <p>Legal feasibility, disclosure clarity, expected timeline and a fair transition if membership issuance is delayed.</p>
              </div>
            </div>

            <div className="case-status-line">
              <span>STATUS: GATHERING EVIDENCE</span>
              <span>VOTES: NOT OPEN</span>
              <span>LIKES: NOT A GOVERNANCE FIELD</span>
            </div>

            <ResponseActions />
          </div>
        </section>

        <section className="source-package" id="source" aria-labelledby="source-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">THE SOURCE PACKAGE</p>
              <h2 id="source-title">Read the rules behind every pixel.</h2>
            </div>
            <p className="protocol-note">No hidden product deck. Adopted decisions, hypotheses and missing infrastructure are explicit.</p>
          </div>

          <nav className="document-list" aria-label="OURS source documents">
            <a href="/source/OURS.md"><span>01</span><strong>OURS · FOUNDING DIRECTION V0.2</strong><em>ADOPTED</em></a>
            <a href="/source/CONSTITUTION-0.1.md"><span>02</span><strong>FOUNDING CONSTITUTION 0.1</strong><em>OPERATIVE CHARTER</em></a>
            <a href="/source/FOUNDING-RELAY-PROTOCOL.md"><span>03</span><strong>FOUNDING RELAY PROTOCOL</strong><em>IMPLEMENTED · NOT LIVE</em></a>
            <a href="/source/PROPOSAL-AND-DELIBERATION-PROTOCOL.md"><span>04</span><strong>PROPOSAL + DELIBERATION PROTOCOL</strong><em>SPECIFIED · NOT BUILT</em></a>
            <a href="/source/AGENT-BUILD-CONTRACT.md"><span>05</span><strong>AGENT BUILD CONTRACT</strong><em>ADOPTED</em></a>
            <a href="/source/DAY-1.md"><span>06</span><strong>DAY 1 RECORD</strong><em>SHIPPED LOCALLY</em></a>
            <a href="/source/OURS-v0.1.md"><span>07</span><strong>PREHISTORY · FOUNDING DIRECTION V0.1</strong><em>SUPERSEDED</em></a>
            <a href="/status"><span>08</span><strong>LIVE SERVICE + LEDGER STATUS</strong><em>TRUTHFUL STATE</em></a>
            <a href="/source/FOUNDING-LEDGER-BUILD-HANDOFF.md"><span>09</span><strong>FOUNDING LEDGER BUILD HANDOFF</strong><em>AUTHORIZED BUILD PLAN</em></a>
            <a href="/source/FOUNDING-LEDGER-NEXT-SESSION-PROMPT.md"><span>10</span><strong>NEXT CODING SESSION PROMPT</strong><em>BUILD · NOT DEPLOY</em></a>
          </nav>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <strong>OURS TODAY · DAY 1</strong>
          <span>26 AUGUST 2026</span>
        </div>
        <p>THIS IS A LOCAL TEST BUILD. NO CANONICAL ENTRY, LEGAL MEMBERSHIP, PUBLIC RESPONSE OR OWNERSHIP IS CREATED HERE UNLESS THE LEDGER IS EXPLICITLY OPENED.</p>
        <a href="#top">BACK TO ORIGIN ↑</a>
      </footer>
    </>
  );
}


