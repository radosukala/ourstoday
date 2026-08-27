import { Masthead } from "@/components/Masthead";
import { loadEditionInputs } from "@/edition/data";
import {
  buildCardAltText,
  buildLinkedInPost,
  buildXPost,
  composeEdition,
  editionDayNumber,
  editionDateLabel,
} from "@/edition/compose";
import type { Metadata } from "next";

/**
 * Cached like /status and for the same reason: this is a public projection
 * with nothing session-specific, and a burst of readers must not keep the
 * database awake. The edition changes at most a few times a day.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const dateUtc = new Date().toISOString().slice(0, 10);
  const day = editionDayNumber(dateUtc);
  const title = `Day ${day} · The Edition · OURS TODAY`;
  const description =
    "The daily edition, composed from the canonical ledger: what formed, what was built, " +
    "what is not yet true, and the open decision. Published every day since 26 August 2026.";
  return {
    title,
    description,
    openGraph: {
      title: `OURS TODAY — Day ${day}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `OURS TODAY — Day ${day}`,
      description,
    },
  };
}

const shareBlock: React.CSSProperties = {
  margin: 0,
  padding: "18px 20px",
  border: "1px solid var(--paper-line)",
  font: "13px/1.6 var(--mono)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

export default async function TodayPage() {
  const inputs = await loadEditionInputs();
  const edition = composeEdition(inputs);
  const xPost = buildXPost(edition);
  const linkedInPost = buildLinkedInPost(edition);
  const altText = buildCardAltText(edition);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the edition
      </a>
      <Masthead formationStatus={"THE EDITION · DAY " + edition.day} />
      <main id="main">
        <section className="page-shell" aria-labelledby="edition-title">
          <p className="eyebrow">THE DAILY EDITION · COMPOSED FROM THE CANONICAL LEDGER</p>
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
            {edition.dateLabel} · Edition №{edition.day} · Published every day since 26 AUG 2026.
            Nothing on this page is written from memory: every line below is composed from the
            public record at the moment you loaded it, and anyone with an export can recompute it.
          </p>

          <ul className="event-list" aria-label="Today's four tapes" style={{ marginTop: 36 }}>
            <li>
              <time>FORMED</time>
              <div>
                <strong>{edition.formed}</strong>
                <span>Entries and continuations are canonical events, never clicks.</span>
              </div>
              <b>
                <a href="/#ledger">LEDGER ↗</a>
              </b>
            </li>
            <li>
              <time>BUILT</time>
              <div>
                <strong>{edition.built}</strong>
                <span>Receipts appended to the log: deploys, gates, anchors, conformance.</span>
              </div>
              <b>
                <a href="/api/v1/formation-tape">TAPE ↗</a>
              </b>
            </li>
            <li>
              <time className="signal-text">NOT YET</time>
              <div>
                <strong>{edition.notYet}</strong>
                <span>What is not yet true about us, stated before anyone asks.</span>
              </div>
              <b>
                <a href="/status">STATUS ↗</a>
              </b>
            </li>
            <li>
              <time>OPEN</time>
              <div>
                <strong>{edition.open}</strong>
                <span>Respond with something the network can use, not a reaction.</span>
              </div>
              <b>
                <a href="/#decision">CASE ↗</a>
              </b>
            </li>
          </ul>
          <p className="status-note">{edition.statusLine}.</p>
        </section>

        <section className="page-shell ink-section" aria-labelledby="carry-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow signal-text">CARRY THE EDITION · STARTING LANGUAGE</p>
              <h2 id="carry-title">Take today with you.</h2>
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
              <a className="document-link inverse-link" href="/api/v1/edition/card">
                DOWNLOAD TODAY&apos;S CARD <span aria-hidden="true">↗</span>
              </a>{" "}
              <a className="document-link inverse-link" href="/api/v1/edition">
                EDITION AS JSON <span aria-hidden="true">↗</span>
              </a>
            </p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <strong>OURS TODAY</strong>
          <span>{editionDateLabel(edition.dateUtc)}</span>
        </div>
        <p>
          THE EDITION REPORTS THE REAL STATE OF THIS ENVIRONMENT. IT NEVER CLAIMS MEMBERSHIP OR
          OWNERSHIP.
        </p>
        <a href="/">BACK TO THE INSTRUMENT ↑</a>
      </footer>
    </>
  );
}
