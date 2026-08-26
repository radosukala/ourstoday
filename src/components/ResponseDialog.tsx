"use client";

import { useRef, useState } from "react";

/**
 * P-0001 local response drafts. Exactly like Day 1: responses stay in this
 * browser, are never submitted, counted or reviewed by OURS.
 */
const RESPONSE_TYPES = [
  "I experience this problem",
  "I will test this",
  "I will switch if",
  "I bring evidence",
  "I object because",
  "I can steward this",
] as const;

const STORAGE_KEY = "ours-today-response-drafts-v1";

interface StoredDraft {
  schema: string;
  draftId: string;
  createdAt: string;
  proposalId: string;
  responseType: string;
  text: string;
  sourceUrl: string | null;
  canonicalResponse: false;
  submitted: false;
  notice: string;
}

export function ResponseActions() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeType, setActiveType] = useState<string>("");
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<{ msg: string; state: "ok" | "error" } | null>(null);

  function readDrafts(): StoredDraft[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as StoredDraft[]) : [];
    } catch {
      return [];
    }
  }

  function refreshCount() {
    setCount(readDrafts().length);
  }

  function open(type: string) {
    setActiveType(type);
    setStatus(null);
    refreshCount();
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) {
      setStatus({ msg: "Complete the response and local-only acknowledgment.", state: "error" });
      return;
    }
    const data = new FormData(form);
    const draft: StoredDraft = {
      schema: "ourstoday.local-proposal-response/v1",
      draftId:
        "RESPONSE-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        Math.random().toString(36).slice(2, 10).toUpperCase(),
      createdAt: new Date().toISOString(),
      proposalId: "P-0001",
      responseType: String(data.get("responseType") || ""),
      text: String(data.get("responseText") || "").trim(),
      sourceUrl: String(data.get("sourceUrl") || "").trim() || null,
      canonicalResponse: false,
      submitted: false,
      notice: "Private local draft only. This is not submitted, counted, reviewed or used by OURS.",
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...readDrafts(), draft]));
      refreshCount();
      setStatus({
        msg: "LOCAL RESPONSE DRAFT SAVED. IT WAS NOT SUBMITTED OR COUNTED.",
        state: "ok",
      });
      form.reset();
      close();
    } catch {
      setStatus({
        msg: "This browser did not allow local storage. Nothing was saved.",
        state: "error",
      });
    }
  }

  function deleteAll() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage may be unavailable */
    }
    refreshCount();
    setStatus({ msg: "ALL LOCAL RESPONSE DRAFTS DELETED.", state: "ok" });
  }

  return (
    <>
      <div className="response-actions" aria-labelledby="respond-title">
        <h3 id="respond-title">Respond with something the network can use.</h3>
        {RESPONSE_TYPES.map((type) => (
          <button key={type} type="button" data-response={type} onClick={() => open(type)}>
            {type === "I will switch if" ? "I WILL SWITCH IF…" : type.toUpperCase()}
          </button>
        ))}
      </div>
      {count !== null && count > 0 && (
        <div className="local-response-tools">
          <span>
            {count === 1
              ? "1 LOCAL RESPONSE DRAFT · NOT SUBMITTED"
              : count + " LOCAL RESPONSE DRAFTS · NOT SUBMITTED"}
          </span>
          <button className="small-button" type="button" onClick={deleteAll}>
            DELETE LOCAL RESPONSE DRAFTS
          </button>
        </div>
      )}
      <p
        className="form-status"
        id="proposal-status"
        role="status"
        aria-live="polite"
        data-state={status?.state}
      >
        {status?.msg}
      </p>
      <dialog className="response-dialog" ref={dialogRef} aria-labelledby="response-title">
        <form onSubmit={onSubmit} noValidate>
          <div className="dialog-head">
            <div>
              <p className="eyebrow">P-0001 · LOCAL RESPONSE DRAFT</p>
              <h2 id="response-title">{activeType}</h2>
            </div>
            <button
              className="dialog-close"
              type="button"
              aria-label="Close response form"
              onClick={close}
            >
              ×
            </button>
          </div>
          <label className="field-label" htmlFor="response-text">
            YOUR CLAIM, COMMITMENT OR OBJECTION
          </label>
          <textarea
            id="response-text"
            name="responseText"
            rows={7}
            maxLength={1200}
            required
          ></textarea>
          <label className="field-label" htmlFor="source-url">
            SOURCE URL <span>OPTIONAL</span>
          </label>
          <input
            id="source-url"
            name="sourceUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
          />
          <label className="check-row">
            <input name="responseLocalOnly" type="checkbox" required />
            <span>
              I understand this response stays only in this browser. It is not submitted, counted or
              reviewed by OURS.
            </span>
          </label>
          <button className="action-button" type="submit">
            SAVE LOCAL RESPONSE DRAFT <span aria-hidden="true">→</span>
          </button>
          <p className="form-status" role="status" aria-live="polite" data-state={status?.state}>
            {status?.msg}
          </p>
        </form>
      </dialog>
    </>
  );
}
