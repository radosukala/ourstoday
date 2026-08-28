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
      {/* These pointed at /#ledger, /#tapes, /#constitution and /#decision —
          sections of the Day 1 homepage. The Founding Million replaced that
          page, so four of the five links on every record page led nowhere.
          They now name pages that exist. */}
      <nav className="main-nav" aria-label="The record">
        <a href="/today">TODAY</a>
        <a href="/status">STATUS</a>
        <a href="/anchors">ANCHORS</a>
        <a href="/source/FOUNDING-RIGHT-0.1.md">THE RIGHT</a>
        <a href="/enter">ENTER</a>
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
