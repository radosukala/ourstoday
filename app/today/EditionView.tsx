import { Masthead } from "@/components/Masthead";
import { buildCardAltText, buildLinkedInPost, buildXPost, type Edition } from "@/edition/compose";

/**
 * One edition, rendered. Shared by /today (the latest completed day) and the
 * /today/[day] archive — the same record, addressed two ways.
 */

const shareBlock: React.CSSProperties = {
  margin: 0,
  padding: "18px 20px",
  border: "1px solid var(--paper-line)",
  font: "13px/1.6 var(--mono)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

export function EditionView({ edition, latestDay }: { edition: Edition; latestDay: number }) {
  const isLatest = edition.day === latestDay;
  const xPost = buildXPost(edition);
  const linkedInPost = buildLinkedInPost(edition);
  const altText = buildCardAltText(edition);
  const cardHref = isLatest ? "/api/v1/edition/card" : `/api/v1/edition/card?day=${edition.day}`;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the edition
      </a>
      <Masthead formationStatus={"THE EDITION · DAY " + edition.day} />
      <main id="main">
        <section className="page-shell" aria-labelledby="edition-title">
          <p className="eyebrow">
            THE DAILY EDITION · {isLatest ? "COMPOSED" : "RECOMPUTED"} FROM THE CANONICAL LEDGER
          </p>
          <h1
            id="edition-title"
            style={{
              fontSize: "clamp(34px, 5.5vw, 78px)",
              letterSpacing: "-0.058em",
              lineHeight: 0.94,
            }}
          >
            Day {edition.day}.
          </h1>
          <p className="status-note">
            THE RECORD OF {edition.dateLabel} (UTC DAY), PUBLISHED THE MORNING AFTER. Nothing here
            is written from memory: FORMED and BUILT are recomputed from the public record every
            time this page loads, and anyone with an export can recompute them without us. The
            archive is not stored anywhere — the ledger is the archive.
          </p>

          <ul className="event-list" aria-label="The four tapes" style={{ marginTop: 36 }}>
            <li>
              <time>FORMED</time>
              <div>
                <strong>{edition.formed}</strong>
                <span>
                  That day&apos;s entries and continuations — canonical events, never clicks.
                </span>
              </div>
              <b>
                <a href="/#ledger">LEDGER ↗</a>
              </b>
            </li>
            <li>
              <time>BUILT</time>
              <div>
                <strong>{edition.built}</strong>
                <span>
                  That day&apos;s receipts in the log: deploys, gates, anchors, conformance.
                </span>
              </div>
              <b>
                <a href="/api/v1/formation-tape">TAPE ↗</a>
              </b>
            </li>
            <li>
              <time className="signal-text">NOT YET</time>
              <div>
                <strong>{edition.notYet}</strong>
                <span>Always live, never replayed: what is not yet true is evaluated now.</span>
              </div>
              <b>
                <a href="/status">STATUS ↗</a>
              </b>
            </li>
            <li>
              <time>OPEN</time>
              <div>
                <strong>{edition.open}</strong>
                <span>Live. Respond with something the network can use, not a reaction.</span>
              </div>
              <b>
                <a href="/#decision">CASE ↗</a>
              </b>
            </li>
          </ul>
          <p className="status-note">{edition.statusLine}.</p>

          <nav
            className="main-nav"
            aria-label="Edition archive"
            style={{ marginTop: 26, justifyContent: "flex-start" }}
          >
            {edition.day > 1 ? (
              <a href={`/today/${edition.day - 1}`}>← DAY {edition.day - 1}</a>
            ) : null}
            {!isLatest && edition.day + 1 <= latestDay ? (
              <a href={`/today/${edition.day + 1}`}>DAY {edition.day + 1} →</a>
            ) : null}
            {!isLatest ? <a href="/today">LATEST EDITION ↗</a> : null}
          </nav>
        </section>

        {isLatest ? (
          <section className="page-shell ink-section" aria-labelledby="carry-title">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow signal-text">CARRY THE EDITION · STARTING LANGUAGE</p>
                <h2 id="carry-title">Take yesterday with you.</h2>
              </div>
              <p className="protocol-note">
                This is starting language, not a script. Edit it, then publish under your own hand.
                OURS never posts on anyone&apos;s behalf.
              </p>
            </div>

            <div style={{ display: "grid", gap: 22, maxWidth: 760 }}>
              <div>
                <p className="eyebrow">FOR X</p>
                <pre style={shareBlock}>{xPost}</pre>
              </div>
              <div>
                <p className="eyebrow">FOR LINKEDIN</p>
                <pre style={shareBlock}>{linkedInPost}</pre>
              </div>
              <div>
                <p className="eyebrow">CARD ALT TEXT · ATTACH IT WITH THE IMAGE</p>
                <pre style={shareBlock}>{altText}</pre>
              </div>
              <p style={{ margin: 0 }}>
                <a className="document-link inverse-link" href={cardHref}>
                  DOWNLOAD THE CARD <span aria-hidden="true">↗</span>
                </a>{" "}
                <a className="document-link inverse-link" href="/api/v1/edition">
                  EDITION AS JSON <span aria-hidden="true">↗</span>
                </a>
              </p>
            </div>
          </section>
        ) : (
          <section className="page-shell" aria-label="Archive card">
            <p style={{ margin: 0 }}>
              <a className="document-link" href={cardHref}>
                CARD FOR DAY {edition.day} <span aria-hidden="true">↗</span>
              </a>
            </p>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <strong>OURS TODAY</strong>
          <span>{edition.dateLabel}</span>
        </div>
        <p>
          THE EDITION REPORTS THE REAL STATE OF THE RECORD. IT NEVER CLAIMS MEMBERSHIP OR OWNERSHIP.
        </p>
        <a href="/">BACK TO THE INSTRUMENT ↑</a>
      </footer>
    </>
  );
}
