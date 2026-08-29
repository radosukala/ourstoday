import { FOUNDING_LIMIT } from "@/founding/right";

/**
 * The chrome the Founding Million wears.
 *
 * The homepage and the entry flow used to carry different headers: an ink
 * terminal on one side, the Day 1 paper masthead on the other, with a
 * different wordmark treatment and a different navigation. A person who
 * pressed the button on the front page arrived somewhere that looked like a
 * different project at the exact moment they were deciding to trust it.
 *
 * One header, one footer, one voice, from the message to the seal.
 */

export function FoundingTopline({ status }: { status?: string }) {
  return (
    <header className="fm-topline">
      <a className="fm-logo" href="/" aria-label="OURS home">
        OURS
      </a>
      <p>
        <i aria-hidden="true" /> {status ?? "FOUNDING MILLION"} · 000001—
        {FOUNDING_LIMIT.toLocaleString("en-US")}
      </p>
      <nav aria-label="Formation record">
        <a href="/worth">THE SIMULATOR</a>
        <a href="/source/FOUNDING-RIGHT-0.1.md">THE RIGHT</a>
        <a href="/status">LIVE STATE</a>
      </nav>
    </header>
  );
}

export function FoundingFooter() {
  return (
    <footer className="fm-footer">
      <p>
        FOUNDING RIGHT 0.1 IS OPERATIVE PROJECT LAW · NOT A LEGAL SHARE OR SECURITY · LEGAL
        MEMBERSHIP NOT YET ISSUED
      </p>
      <nav aria-label="Full record">
        <a href="/source/CONSTITUTION-0.1.md">CONSTITUTION</a>
        <a href="/source/CONSTITUTION-AMENDMENT-0.1-FOUNDING-MILLION.md">AMENDMENT</a>
        <a href="/worth">WHAT THEY TAKE</a>
        <a href="/today">THE RECORD</a>
        <a href="/me">YOUR ACCOUNT</a>
      </nav>
    </footer>
  );
}
