(function () {
  'use strict';

  const ENTRY_KEY = 'ours-today-entry-draft-v1';
  const RESPONSE_KEY = 'ours-today-response-drafts-v1';

  const entryForm = document.querySelector('#entry-form');
  const entryStatus = document.querySelector('#entry-status');
  const draftReceipt = document.querySelector('#draft-receipt');
  const draftName = document.querySelector('#draft-name');
  const draftStatus = document.querySelector('#draft-status');
  const copyIntention = document.querySelector('#copy-intention');
  const exportDraft = document.querySelector('#export-draft');
  const deleteDraft = document.querySelector('#delete-draft');

  const responseDialog = document.querySelector('#response-dialog');
  const responseForm = document.querySelector('#response-form');
  const responseTitle = document.querySelector('#response-title');
  const responseType = document.querySelector('#response-type');
  const responseText = document.querySelector('#response-text');
  const responseStatus = document.querySelector('#response-status');
  const proposalStatus = document.querySelector('#proposal-status');
  const closeDialog = document.querySelector('#close-dialog');
  const localResponseTools = document.querySelector('#local-response-tools');
  const localResponseCount = document.querySelector('#local-response-count');
  const deleteResponses = document.querySelector('#delete-responses');

  document.documentElement.classList.add('js');

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeLocal(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function setStatus(node, message, state) {
    if (!node) return;
    node.textContent = message;
    if (state) node.dataset.state = state;
    else delete node.dataset.state;
  }

  function makeId(prefix) {
    const random = window.crypto && window.crypto.getRandomValues
      ? Array.from(window.crypto.getRandomValues(new Uint8Array(5)), function (n) {
        return n.toString(16).padStart(2, '0');
      }).join('')
      : Math.random().toString(36).slice(2, 12);
    return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + random.toUpperCase();
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    if (!copied) throw new Error('Copy was not available');
  }

  function showDraft(draft) {
    if (!draft || !draft.displayName) {
      draftReceipt.hidden = true;
      return;
    }
    draftName.textContent = draft.displayName;
    draftReceipt.hidden = false;
  }

  function createEntryDraft(event) {
    event.preventDefault();
    setStatus(entryStatus, '', '');

    if (!entryForm.reportValidity()) {
      setStatus(entryStatus, 'Complete the declaration and local-preview acknowledgment.', 'error');
      return;
    }

    const data = new FormData(entryForm);
    const displayName = String(data.get('displayName') || '').trim();
    if (!displayName) {
      setStatus(entryStatus, 'Add a public name or pseudonym.', 'error');
      document.querySelector('#display-name').focus();
      return;
    }

    const draft = {
      schema: 'ourstoday.local-entry-draft/v1',
      draftId: makeId('DRAFT'),
      createdAt: new Date().toISOString(),
      displayName: displayName,
      verificationPreference: String(data.get('verificationChoice') || 'undecided'),
      declarationVersion: 'ours-founding-declaration/0.1',
      arrivedThroughPreview: '000001',
      canonicalEntry: false,
      publicNumber: null,
      relayIssued: false,
      legalMembershipIssued: false,
      notice: 'Private local draft only. This is not submitted to OURS and creates no ledger entry, membership or ownership.'
    };

    if (!writeJson(ENTRY_KEY, draft)) {
      setStatus(entryStatus, 'This browser did not allow local storage. Nothing was saved.', 'error');
      return;
    }

    showDraft(draft);
    setStatus(entryStatus, 'LOCAL DRAFT PREPARED. NO CANONICAL NUMBER WAS ISSUED.', 'ok');
    draftReceipt.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }

  function intentionCopy(draft) {
    return [
      'I intend to enter the Founding Ledger of OURS when the canonical ledger opens.',
      '',
      'The network is ours. Everything else can be built.',
      '',
      'This is an intention—not a sealed ledger entry or legal membership.'
    ].join('\n');
  }

  entryForm.addEventListener('submit', createEntryDraft);

  copyIntention.addEventListener('click', async function () {
    const draft = readJson(ENTRY_KEY, null);
    if (!draft) return;
    try {
      await copyText(intentionCopy(draft));
      setStatus(draftStatus, 'INTENTION COPIED. IT DOES NOT CLAIM A SEALED ENTRY.', 'ok');
    } catch (error) {
      setStatus(draftStatus, 'COPY WAS UNAVAILABLE. EXPORT THE DRAFT INSTEAD.', 'error');
    }
  });

  exportDraft.addEventListener('click', function () {
    const draft = readJson(ENTRY_KEY, null);
    if (!draft) return;
    downloadJson('ours-entry-draft-' + draft.createdAt.slice(0, 10) + '.json', draft);
    setStatus(draftStatus, 'LOCAL DRAFT EXPORTED.', 'ok');
  });

  deleteDraft.addEventListener('click', function () {
    removeLocal(ENTRY_KEY);
    entryForm.reset();
    draftReceipt.hidden = true;
    setStatus(entryStatus, 'LOCAL ENTRY DRAFT DELETED.', 'ok');
  });

  function responseDrafts() {
    const value = readJson(RESPONSE_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function renderResponseCount() {
    const count = responseDrafts().length;
    localResponseTools.hidden = count === 0;
    localResponseCount.textContent = count === 1
      ? '1 LOCAL RESPONSE DRAFT · NOT SUBMITTED'
      : count + ' LOCAL RESPONSE DRAFTS · NOT SUBMITTED';
  }

  function openResponse(type) {
    responseForm.reset();
    responseType.value = type;
    responseTitle.textContent = type;
    setStatus(responseStatus, '', '');
    if (typeof responseDialog.showModal === 'function') responseDialog.showModal();
    else responseDialog.setAttribute('open', '');
    window.setTimeout(function () { responseText.focus(); }, 0);
  }

  document.querySelectorAll('[data-response]').forEach(function (button) {
    button.addEventListener('click', function () {
      openResponse(button.dataset.response || 'Response');
    });
  });

  closeDialog.addEventListener('click', function () {
    if (typeof responseDialog.close === 'function') responseDialog.close();
    else responseDialog.removeAttribute('open');
  });

  responseDialog.addEventListener('click', function (event) {
    if (event.target !== responseDialog) return;
    if (typeof responseDialog.close === 'function') responseDialog.close();
    else responseDialog.removeAttribute('open');
  });

  responseForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!responseForm.reportValidity()) {
      setStatus(responseStatus, 'Complete the response and local-only acknowledgment.', 'error');
      return;
    }

    const data = new FormData(responseForm);
    const draft = {
      schema: 'ourstoday.local-proposal-response/v1',
      draftId: makeId('RESPONSE'),
      createdAt: new Date().toISOString(),
      proposalId: 'P-0001',
      responseType: String(data.get('responseType') || ''),
      text: String(data.get('responseText') || '').trim(),
      sourceUrl: String(data.get('sourceUrl') || '').trim() || null,
      canonicalResponse: false,
      submitted: false,
      notice: 'Private local draft only. This is not submitted, counted, reviewed or used by OURS.'
    };

    const drafts = responseDrafts();
    drafts.push(draft);
    if (!writeJson(RESPONSE_KEY, drafts)) {
      setStatus(responseStatus, 'This browser did not allow local storage. Nothing was saved.', 'error');
      return;
    }

    renderResponseCount();
    setStatus(proposalStatus, 'LOCAL RESPONSE DRAFT SAVED. IT WAS NOT SUBMITTED OR COUNTED.', 'ok');
    if (typeof responseDialog.close === 'function') responseDialog.close();
    else responseDialog.removeAttribute('open');
  });

  deleteResponses.addEventListener('click', function () {
    removeLocal(RESPONSE_KEY);
    renderResponseCount();
    setStatus(proposalStatus, 'ALL LOCAL RESPONSE DRAFTS DELETED.', 'ok');
  });

  showDraft(readJson(ENTRY_KEY, null));
  renderResponseCount();
})();
