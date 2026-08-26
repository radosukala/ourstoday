import { Masthead } from "@/components/Masthead";
import { listAnchors, ANCHOR_ALGORITHM, type AnchorRow } from "@/ledger/anchor";
import type { Metadata } from "next";

/**
 * Cached, not dynamic, and this is a cost control.
 *
 * Neon bills compute time and only stops billing once the compute SUSPENDS,
 * which needs a few minutes with no connections. A public page that queries on
 * every request means one crawler, or one burst of attention, keeps the
 * database awake continuously. Serving this from the cache and revalidating on
 * a timer bounds database wake-ups to roughly one per window regardless of
 * traffic.
 *
 * The cost is staleness of up to 300 seconds on a public projection,
 * which is acceptable: nothing here is session-specific, and a person's own
 * account at /me stays dynamic.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Provable without us · OURS TODAY",
  description:
    "Merkle roots over the canonical event log, published at a fixed cadence and deposited where durability does not depend on OURS existing. Verify one yourself from the page alone.",
  openGraph: {
    title: "Provable without us",
    description:
      "A record a single company can lose is not a public record. Verify our Merkle roots yourself, offline.",
  },
  twitter: {
    title: "Provable without us",
    description:
      "A record a single company can lose is not a public record. Verify our Merkle roots yourself, offline.",
  },
};

export default async function AnchorsPage() {
  const anchors = await listAnchors(200).catch((): AnchorRow[] => []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to anchors
      </a>
      <Masthead formationStatus="ANCHORS · MERKLE ROOTS" />
      <main id="main">
        <section className="page-shell" aria-labelledby="anchors-title">
          <p className="eyebrow">THE RECORD OUTSIDE THIS DATABASE</p>
          <h1
            id="anchors-title"
            style={{
              fontSize: "clamp(34px, 5.5vw, 78px)",
              letterSpacing: "-0.058em",
              lineHeight: 0.94,
            }}
          >
            Provable without us.
          </h1>
          <p className="large-copy" style={{ maxWidth: 760, marginTop: 26 }}>
            A record a single company can lose is not a public record. At a fixed cadence OURS
            publishes a Merkle root over its canonical event log. The annual root is deposited where
            durability does not depend on OURS existing, on any provider existing, or on any network
            being up: a printed notice, legal deposit with national libraries in several
            jurisdictions, a physical annual volume.
          </p>
          <p className="status-note">
            The point is that a founding position stays provable to a third party even if this
            application, this company and this domain are gone.
          </p>
        </section>

        <section className="page-shell" aria-labelledby="verify-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">HOW TO CHECK THIS YOURSELF</p>
              <h2 id="verify-title">Do not take our word for it.</h2>
            </div>
            <p className="protocol-note">
              The construction is deliberately boring so you can reimplement it in an afternoon, in
              any language, from this description alone.
            </p>
          </div>
          <ol className="enter-steps">
            <li>
              <b>01</b>
              <span>
                Take the canonical events in ascending sequence order, and their stored digests.
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                Hash each digest as a leaf:{" "}
                <code>SHA-256(&quot;ours.anchor.leaf/1 &quot; + digest)</code>.
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                Pair adjacent nodes left to right:{" "}
                <code>SHA-256(&quot;ours.anchor.node/1 &quot; + left + right)</code>. An odd node is
                carried up unchanged, never duplicated.
              </span>
            </li>
            <li>
              <b>04</b>
              <span>Repeat until one node remains. That is the root, as lowercase hex.</span>
            </li>
            <li>
              <b>05</b>
              <span>
                Compare it with the published root below for the same sequence range. Different
                prefixes for leaves and nodes mean no leaf can be passed off as a node.
              </span>
            </li>
          </ol>
          <p className="status-note">
            ALGORITHM: {ANCHOR_ALGORITHM}. Or run <code>pnpm fork export</code> then{" "}
            <code>pnpm fork verify</code>, which reproduces every root offline, with no database and
            no network.
          </p>
        </section>

        <section className="page-shell" aria-labelledby="published-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">PUBLISHED ROOTS</p>
              <h2 id="published-title">Every root, and where it was deposited.</h2>
            </div>
          </div>

          {anchors.length === 0 ? (
            <p className="neutral-note">
              NO ANCHOR HAS BEEN PUBLISHED YET. AN ARCHIVE STARTED IN YEAR THREE IS A MARKETING
              ARTIFACT. STARTED IN MONTH ONE, IT IS A RECORD.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="ledger-table">
                <caption className="sr-only">Published Merkle roots</caption>
                <thead>
                  <tr>
                    <th scope="col">PERIOD</th>
                    <th scope="col">ROOT</th>
                    <th scope="col">EVENTS</th>
                    <th scope="col">SEQUENCE RANGE</th>
                    <th scope="col">DEPOSITED</th>
                    <th scope="col">PUBLISHED</th>
                  </tr>
                </thead>
                <tbody>
                  {anchors.map((anchor) => (
                    <tr key={anchor.periodKind + anchor.periodLabel}>
                      <td>
                        <strong>{anchor.periodKind}</strong> {anchor.periodLabel}
                      </td>
                      <td style={{ fontSize: 11, wordBreak: "break-all", maxWidth: 280 }}>
                        {anchor.merkleRoot}
                      </td>
                      <td>{anchor.eventCount}</td>
                      <td>
                        {anchor.eventSeqFrom}–{anchor.eventSeqTo}
                      </td>
                      <td>
                        {Array.isArray(anchor.locations) && anchor.locations.length > 0
                          ? anchor.locations.map((l) => String(l)).join(" · ")
                          : "—"}
                      </td>
                      <td>
                        <time dateTime={anchor.publishedAt.toISOString()}>
                          {anchor.publishedAt.toISOString().slice(0, 10)}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="status-note">
            A root verifies over the SEQUENCE RANGE it covers, not over the calendar period:
            publishing an anchor appends an event to that same period, so the period always grows
            after the fact. The range is what a root commits to.
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <strong>OURS TODAY · ANCHORS</strong>
          <span>26 AUGUST 2026</span>
        </div>
        <p>
          AN ANCHOR PROVES WHAT THE RECORD SAID AT A MOMENT IN TIME. IT IS NOT LEGAL MEMBERSHIP,
          OWNERSHIP OR A SECURITY.
        </p>
        <a href="/status">SERVICE + LEDGER STATUS ↗</a>
      </footer>
    </>
  );
}
