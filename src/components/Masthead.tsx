
import { STATUS_LINE } from "@/legal/documents";

/** Shared masthead. The formation status text is passed per page so it can
 *  tell the truth about that environment. */
export function Masthead({ formationStatus }: { formationStatus: string }) {
  return (
    <header className="masthead" aria-label="OURS TODAY">
      <a className="wordmark" href="/" aria-label="OURS TODAY home">OURS</a>
      <div className="edition-mark">
        <strong>OURS TODAY</strong>
        <span>DAY 1 · 26 AUG 2026</span>
      </div>
      <div className="formation-status"><i aria-hidden="true"></i> {formationStatus}</div>
      <nav className="main-nav" aria-label="Day 1 sections">
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

