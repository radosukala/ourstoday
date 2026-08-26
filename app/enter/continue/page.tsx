import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getAuth } from "@/auth/auth";
import { getPersonByAuthUserId } from "@/lib/person";
import { Masthead } from "@/components/Masthead";
import { SealForm } from "./SealForm";
import { currentDocumentVersions, STATUS_LINE } from "@/legal/documents";

export const dynamic = "force-dynamic";

export default async function ContinuePage() {
  const jar = await cookies();
  const headers = new Headers();
  const raw = jar.toString();
  if (raw) headers.set("cookie", raw);
  const session = await getAuth()
    .api.getSession({ headers })
    .catch(() => null);
  if (!session?.user?.id) redirect("/enter");

  const person = await getPersonByAuthUserId(session.user.id);
  const versions = currentDocumentVersions();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to sealing
      </a>
      <Masthead
        formationStatus={"SIGNED IN · " + session.user.email.replace(/^(.).*(@.*)$/, "$1***$2")}
      />
      <main id="main">
        <section className="entry-instrument ink-section" aria-labelledby="seal-title">
          <div className="entry-copy">
            <p className="eyebrow signal-text">ENTRY · SIGNED IN · FINAL CONSENT</p>
            <h2 id="seal-title">Choose your public name. Read what you accept. Then seal.</h2>
            <p className="large-copy">
              Your number is assigned only when the seal commits. Nothing is reserved now, and
              nobody needs a successor for you to keep your place.
            </p>
            <div className="receipt-block">
              <div className="receipt-line">
                <dt>YOU ACCEPT</dt>
                <dd>Declaration {versions.declaration}</dd>
              </div>
              <div className="receipt-line">
                <dt></dt>
                <dd>Constitution {versions.constitution}</dd>
              </div>
              <div className="receipt-line">
                <dt></dt>
                <dd>Relay protocol {versions.protocol}</dd>
              </div>
              <div className="receipt-line">
                <dt></dt>
                <dd>Privacy notice draft {versions.privacyNotice}</dd>
              </div>
              <div className="receipt-line">
                <dt></dt>
                <dd>Legal status {versions.legalStatus}</dd>
              </div>
              <div className="receipt-line">
                <dt>READ THE DOCUMENTS</dt>
                <dd>
                  <Link href="/source/FOUNDING-RELAY-PROTOCOL.md" style={{ color: "var(--paper)" }}>
                    RELAY PROTOCOL
                  </Link>{" "}
                  ·{" "}
                  <Link href="/source/CONSTITUTION-0.1.md" style={{ color: "var(--paper)" }}>
                    CONSTITUTION
                  </Link>
                </dd>
              </div>
            </div>
          </div>
          <div className="entry-panel">
            <SealForm
              versions={versions}
              alreadySealed={person ? await hasEntry(person.id) : false}
            />
            <p className="neutral-note">{STATUS_LINE}</p>
          </div>
        </section>
      </main>
    </>
  );
}

async function hasEntry(personId: string): Promise<boolean> {
  try {
    const { rawQuery } = await import("@/db/sqltype");
    const rows = await rawQuery<{ id: string }>(
      "SELECT id FROM ledger.entry WHERE person_id = $1 AND lifecycle <> 'VOIDED' LIMIT 1",
      [personId],
    );
    return Boolean(rows[0]);
  } catch {
    return false;
  }
}
