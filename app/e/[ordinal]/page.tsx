
import { notFound } from "next/navigation";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { getPublicEntry } from "@/ledger/queries";
import { STATUS_LINE } from "@/legal/documents";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return String(n).padStart(6, "0");
}

export default async function EntryPage({ params }: { params: Promise<{ ordinal: string }> }) {
  const { ordinal } = await params;
  const parsed = Number.parseInt(ordinal, 10);
  if (!Number.isInteger(parsed)) notFound();
  const entry = await getPublicEntry(parsed).catch(() => null);
  if (!entry) notFound();

  const tombstoned = entry.displayName === null;

  return (
    <>
      <a className="skip-link" href="#main">Skip to the receipt</a>
      <Masthead formationStatus="PUBLIC ENTRY RECEIPT" />
      <main id="main">
        <section className="entry-instrument ink-section" aria-labelledby="entry-receipt-title">
          <div className="entry-copy">
            <p className="eyebrow signal-text">FOUNDING LEDGER · ENTRY RECEIPT</p>
            <h2 id="entry-receipt-title">
              {tombstoned ? "This place is preserved as a tombstone." : "A place in the formation record."}
            </h2>
            <div className="receipt-block" style={{ marginTop: 34 }}>
              <div className="receipt-line"><dt>PUBLIC NUMBER</dt><dd>{"#" + pad(entry.ordinal)}</dd></div>
              <div className="receipt-line"><dt>PERSON</dt><dd>{tombstoned ? "[WITHDRAWN]" : entry.displayName}</dd></div>
              <div className="receipt-line"><dt>ENTERED</dt><dd>{new Date(entry.enteredAt).toISOString().slice(0, 10)}</dd></div>
              <div className="receipt-line"><dt>ARRIVED THROUGH</dt><dd>{entry.predecessorOrdinal !== null ? "#" + pad(entry.predecessorOrdinal) : entry.originKind === "DECLARED_ORIGIN" ? "ORIGIN" : "-"}</dd></div>
              <div className="receipt-line"><dt>RELAY</dt><dd>{entry.relayState}</dd></div>
              <div className="receipt-line"><dt>FIRST CONTINUATION</dt><dd>{entry.firstContinuationOrdinal !== null ? "#" + pad(entry.firstContinuationOrdinal) : "NOT YET"}</dd></div>
              <div className="receipt-line"><dt>PUBLIC STATUS</dt><dd>{entry.publicStatus}</dd></div>
              <div className="receipt-line"><dt>LEGAL MEMBERSHIP</dt><dd>NOT YET ISSUED</dd></div>
            </div>
          </div>
          <div className="entry-panel">
            <p className="large-copy" style={{ color: "var(--paper-quiet)" }}>{STATUS_LINE}</p>
            <p className="neutral-note" style={{ color: "var(--paper-quiet)" }}>
              A FOUNDING LEDGER ENTRY IS NOT A SHARE, SECURITY, TOKEN OR LEGAL MEMBERSHIP.
              NUMBERS ARE NEVER REASSIGNED. CORRECTIONS AND WITHDRAWALS ARE APPENDED EVENTS.
            </p>
            <Link className="action-button inverse" href="/" style={{ marginTop: 30 }}>BACK TO THE INSTRUMENT <span aria-hidden="true">↑</span></Link>
          </div>
        </section>
      </main>
    </>
  );
}

