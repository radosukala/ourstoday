import { STATUS_LINE } from "@/legal/documents";
import { editionDayNumber, editionDateLabel } from "@/edition/compose";

/** Shared masthead. The formation status text is passed per page so it can
 *  tell the truth about that environment. */
export function Masthead({ formationStatus }: { formationStatus: string }) {
  // Computed, not remembered: a masthead that still says DAY 1 on day forty
  // is the site describing itself from memory. Pages render on a revalidate
  // timer, so the label follows the calendar without a request-time clock.
  const dateUtc = new Date().toISOString().slice(0, 10);
  return (
    <header className="masthead" aria-label="OURS TODAY">
      <a className="wordmark" href="/" aria-label="OURS TODAY home">
        OURS
      </a>
      <div className="edition-mark">
        <strong>OURS TODAY</strong>
        <span>
          DAY {editionDayNumber(dateUtc)} · {editionDateLabel(dateUtc)}
        </span>
      </div>
      <div className="formation-status">
        <i aria-hidden="true"></i> {formationStatus}
      </div>
      <nav className="main-nav" aria-label="Day 1 sections">
        <a href="/today">TODAY</a>
        <a href="/#ledger">LEDGER</a>
        <a href="/#tapes">TAPES</a>
        <a href="/#constitution">CONSTITUTION</a>
        <a href="/#decision">DECISION</a>
      </nav>
    </header>
  );
}

export function StatusStrip() {
  return (
    <dl aria-label="Current legal truth" style={{ margin: 0 }}>
      <span className="sr-only">{STATUS_LINE}</span>
    </dl>
  );
}
