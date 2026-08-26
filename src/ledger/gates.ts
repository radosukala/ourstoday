import { getSql, toDate, type DbTimestamp, type OurSql } from "@/db/sqltype";
import { appendCanonicalEvent } from "./append";

/**
 * The sixteen canonical launch gates, as rows.
 *
 * Handoff section 17 lists them as Markdown checkboxes. A checkbox in a
 * document is a claim; a row with required evidence, a blocker and a
 * changed_at is a mechanism. /status renders these live - including the day
 * one slips, which appends an event and says so before anyone asks.
 *
 * Nothing here can open a write gate. Gate state is a public statement about
 * readiness; `ledger.system_state.mode` is the thing that actually permits a
 * canonical write, and only a steward with a receipt moves it.
 */
export type GateState = "OPEN" | "IN_PROGRESS" | "MET" | "SLIPPED";

export interface Gate {
  key: string;
  position: number;
  title: string;
  state: GateState;
  evidenceRequired: string;
  evidenceUri: string | null;
  blockedBy: string | null;
  changedAt: Date;
}

export interface GateSummary {
  gates: Gate[];
  total: number;
  met: number;
  slipped: number;
  /** Lowest-positioned gate not yet met, which is what people actually ask about. */
  oldestOpen: Gate | null;
}

export async function readGates(): Promise<GateSummary> {
  const rows = await getSql().unsafe<
    {
      key: string;
      position: number;
      title: string;
      state: GateState;
      evidence_required: string;
      evidence_uri: string | null;
      blocked_by: string | null;
      changed_at: DbTimestamp;
    }[]
  >("SELECT * FROM public.launch_gates");

  const gates: Gate[] = rows.map((row) => ({
    key: row.key,
    position: row.position,
    title: row.title,
    state: row.state,
    evidenceRequired: row.evidence_required,
    evidenceUri: row.evidence_uri,
    blockedBy: row.blocked_by,
    changedAt: toDate(row.changed_at),
  }));

  const met = gates.filter((g) => g.state === "MET").length;
  return {
    gates,
    total: gates.length,
    met,
    slipped: gates.filter((g) => g.state === "SLIPPED").length,
    oldestOpen: gates.find((g) => g.state !== "MET") ?? null,
  };
}

export class GateError extends Error {}

/**
 * Move a gate and append `ledger.gate.changed`.
 *
 * Marking a gate MET requires evidence: a URI pointing at the thing that makes
 * it true. A gate marked met on assertion alone is the checkbox again, and the
 * whole reason these are rows is that the checkbox was not checkable.
 */
export async function setGateState(args: {
  key: string;
  state: GateState;
  actorLabel: string;
  reason: string;
  evidenceUri?: string | null;
}): Promise<Gate> {
  if (!args.actorLabel.trim() || !args.reason.trim()) {
    throw new GateError("Moving a gate requires a named actor and a reason.");
  }
  if (args.state === "MET" && !args.evidenceUri?.trim()) {
    throw new GateError("A gate cannot be marked MET without an evidence URI.");
  }

  return getSql().begin(async (tx: OurSql) => {
    const current = await tx.unsafe<
      { state: GateState; title: string; evidence_uri: string | null }[]
    >("SELECT state, title, evidence_uri FROM ledger.gate WHERE key = $1 FOR UPDATE", [args.key]);
    const before = current[0];
    if (!before) throw new GateError("No gate with key '" + args.key + "'.");

    await tx.unsafe(
      "UPDATE ledger.gate SET state = $2, evidence_uri = COALESCE($3, evidence_uri), changed_at = now(), changed_by_actor = $4 WHERE key = $1",
      [args.key, args.state, args.evidenceUri ?? null, args.actorLabel],
    );

    await appendCanonicalEvent(tx, {
      type: "ledger.gate.changed",
      actorType: args.actorLabel.toUpperCase().includes("FOUNDER") ? "FOUNDER_STEWARD" : "STEWARD",
      actorRef: args.actorLabel,
      subjectType: "ledger.gate",
      subjectRef: args.key,
      authorityRef: "ours.vision-escalation/0.1",
      privacyClass: "PUBLIC",
      payload: {
        gate: args.key,
        title: before.title,
        from: before.state,
        to: args.state,
        reason: args.reason,
        evidenceUri: args.evidenceUri ?? before.evidence_uri,
      },
    });

    const after = await tx.unsafe<
      {
        key: string;
        position: number;
        title: string;
        state: GateState;
        evidence_required: string;
        evidence_uri: string | null;
        blocked_by: string | null;
        changed_at: DbTimestamp;
      }[]
    >("SELECT * FROM ledger.gate WHERE key = $1", [args.key]);
    const row = after[0];
    if (!row) throw new GateError("Gate vanished mid-transaction.");
    return {
      key: row.key,
      position: row.position,
      title: row.title,
      state: row.state,
      evidenceRequired: row.evidence_required,
      evidenceUri: row.evidence_uri,
      blockedBy: row.blocked_by,
      changedAt: toDate(row.changed_at),
    };
  });
}
