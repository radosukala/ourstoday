/* OURS TODAY — Mission Market app.
 * Vanilla JS, zero dependencies, zero network requests (enforced by CSP).
 */
(function () {
  'use strict';

  const D = window.OURS_DATA;
  const S = window.OURS_STORE;
  const $ = (sel) => document.querySelector(sel);

  let selectedCellId = null;
  let openActionId = null;

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function cellById(id) {
    return D.cells.find((c) => c.id === id) || D.cells[0];
  }
  function stageLabel(stageId) {
    const s = D.stages.find((x) => x.id === stageId);
    return s ? s.label : String(stageId).toUpperCase();
  }
  function trend(t) {
    if (t > 0) return { glyph: '▲ ' + t + '%', cls: 'trend-up', tone: 'hot' };
    if (t < 0) return { glyph: '▼ ' + Math.abs(t) + '%', cls: 'trend-down', tone: 'cool' };
    return { glyph: '◆ FLAT', cls: 'trend-flat', tone: 'flat' };
  }
  function toneVar(tone) {
    return tone === 'hot' ? 'var(--tone-hot)'
      : tone === 'cool' ? 'var(--tone-cool)'
      : tone === 'grow' ? 'var(--tone-grow)'
      : 'var(--tone-flat)';
  }
  function bar(current, target) {
    const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;
    return '<span class="bar"><i style="width:' + pct + '%"></i></span>';
  }
  function statusChip(state) {
    const map = { verified: ['VERIFIED', 'pass'], pass: ['PASS', 'pass'], progress: ['IN PROGRESS', 'progress'], pending: ['PENDING', ''], blocked: ['BLOCKED', 'blocked'] };
    const m = map[state] || [String(state).toUpperCase(), ''];
    return '<span class="chip" data-state="' + m[1] + '">' + m[0] + '</span>';
  }

  /* ---------- top bar ---------- */

  function initTopbar() {
    $('#today-date').textContent = new Date().toISOString().slice(0, 10) + ' · DAILY EDITION';
    $('#theme-btn').addEventListener('click', () => {
      const order = ['auto', 'light', 'dark'];
      const cur = S.state.prefs.theme || 'auto';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      S.setTheme(next);
      applyTheme(next);
    });
    applyTheme(S.state.prefs.theme || 'auto');
    S.subscribe(() => {
      const n = S.state.receipts.length + S.state.pledges.length + S.state.cohorts.length;
      $('#receipt-count').textContent = String(n);
    });
    $('#receipt-count').textContent =
      String(S.state.receipts.length + S.state.pledges.length + S.state.cohorts.length);
  }
  function applyTheme(theme) {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    $('#theme-btn').textContent = 'THEME: ' + theme.toUpperCase();
  }

  /* ---------- daily edition ---------- */

  function renderEdition() {
    $('#edition-strip').innerHTML = D.edition.items.map((it) => (
      '<button class="edition-card" type="button" data-cell="' + esc(it.cell) + '">' +
        '<span class="kicker">' + esc(it.kind) + '</span>' +
        '<strong>' + esc(it.text) + '</strong>' +
      '</button>'
    )).join('');
    $('#edition-strip').querySelectorAll('.edition-card').forEach((card) => {
      card.addEventListener('click', () => selectCell(card.dataset.cell));
    });
  }

  /* ---------- heatmap grid ---------- */
  /* Tile AREA encodes verified commitments (relative scale, ranked). Color + number
     encode 7-day momentum. Status is never color-only: arrows and words carry it too. */

  function renderGrid() {
    const ranked = D.cells.slice().sort((a, b) => b.commitments.verified - a.commitments.verified);
    const rankOf = {};
    ranked.forEach((c, i) => { rankOf[c.id] = i; });

    $('#cell-grid').innerHTML = D.cells.map((c) => {
      const tr = trend(c.commitments.trend);
      return '' +
      '<button class="cell-btn rank-' + rankOf[c.id] + '" type="button" data-cell="' + c.id + '"' +
        ' aria-pressed="false"' +
        ' title="' + esc(c.title) + ' — ' + fmt(c.commitments.verified) + ' verified commitments, 7-day momentum ' + esc(tr.glyph) + '">' +
        '<span class="stage-line"><span class="kicker">' + stageLabel(c.stage) + ' · ' + esc(c.category) + '</span></span>' +
        '<span class="cell-title">' + esc(c.title) + '</span>' +
        '<span class="cell-foot num">' +
          '<span>' + fmt(c.commitments.verified) + ' COMMITTED</span>' +
          '<span class="' + tr.cls + '">' + tr.glyph + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    $('#cell-grid').querySelectorAll('.cell-btn').forEach((btn) => {
      btn.addEventListener('click', () => selectCell(btn.dataset.cell));
    });
  }

  function markSelection() {
    $('#cell-grid').querySelectorAll('.cell-btn').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.cell === selectedCellId));
    });
  }

  /* ---------- cell detail ---------- */

  function localPledgeNote(cell) {
    const local = S.localPledgeMembers(cell.id);
    if (!local) return '';
    return '<br><span class="num">includes ' + fmt(local) + ' from your local pledges</span>';
  }

  function condCurrent(cell, cond) {
    let cur = cond.current;
    if (cond.id === 'committed') cur += S.localPledgeMembers(cell.id);
    return cur;
  }

  function renderDetail(cell) {
    const tr = trend(cell.commitments.trend);

    const conds = cell.unlock.conditions.map((cond) => {
      const cur = condCurrent(cell, cond);
      const unit = cond.unit ? ' ' + cond.unit : '';
      const done = cur >= cond.target;
      return '' +
      '<div class="cond">' +
        '<span class="cond-label">' + esc(cond.label) + '</span>' +
        '<span>' + statusChip(done && cond.status !== 'blocked' ? 'verified' : cond.status) + '</span>' +
        '<span class="cond-meta num">' +
          bar(cur, cond.target) +
          '<span>' + fmt(cur) + ' / ' + fmt(cond.target) + unit + '</span>' +
        '</span>' +
        '<span class="cond-meta">VERIFIER: ' + esc(cond.verifier).toUpperCase() + '</span>' +
      '</div>';
    }).join('');

    const dims = D.dimensions.map((dim) => {
      const r = cell.readiness[dim.id] || { state: 'pending', note: '' };
      return '<span class="chip" data-state="' + (r.state === 'pass' ? 'pass' : r.state === 'blocked' ? 'blocked' : r.state === 'progress' ? 'progress' : '') + '" title="' + esc(r.note) + '">' + esc(dim.label) + ': ' + (r.state === 'pass' ? 'PASS' : r.state.toUpperCase()) + '</span>';
    }).join('');

    $('#detail-root').innerHTML = '' +
    '<div>' +
      '<p class="kicker">CELL ' + esc(cell.num) + ' · ' + stageLabel(cell.stage) + ' · <span class="' + tr.cls + '">7-DAY ' + esc(tr.glyph) + '</span></p>' +
      '<h2 class="detail-title">' + esc(cell.title) + '</h2>' +
      '<p><strong>Mission:</strong> ' + esc(cell.mission) + '</p>' +
      '<p class="thesis-text"><strong>Thesis:</strong> ' + esc(cell.thesis) + '</p>' +
      '<p class="num" style="font-size:12px;color:var(--muted-foreground);">' +
        'PARTICIPATION SNAPSHOT · TESTERS ' + fmt(cell.participants.testers) +
        ' · COMMITTERS ' + fmt(cell.participants.committers) +
        ' · CONTRIBUTORS ' + fmt(cell.participants.contributors) +
        ' · STEWARDS ' + fmt(cell.participants.stewards) +
      '</p>' +
      '<div class="dims" aria-label="Readiness dimensions">' + dims + '</div>' +
    '</div>' +
    '<div class="side">' +
      '<div class="side-box">' +
        '<p class="kicker" style="margin-bottom:8px;">NEXT UNLOCK</p>' +
        '<p style="margin:0 0 6px;font-size:12.5px;">' + esc(cell.unlock.summary) + '</p>' +
        conds +
      '</div>' +
      '<div>' +
        '<div class="actions-grid" aria-label="Ways to participate">' +
          '<button class="action-btn" type="button" data-action="try" aria-expanded="false">TRY TODAY&rsquo;S BUILD</button>' +
          '<button class="action-btn" type="button" data-action="commit" aria-expanded="false">COMMIT MY GROUP</button>' +
          '<button class="action-btn" type="button" data-action="bring" aria-expanded="false">BRING MY PEOPLE</button>' +
          '<button class="action-btn" type="button" data-action="contribute" aria-expanded="false">CONTRIBUTE</button>' +
          '<button class="action-btn" type="button" data-action="steward" aria-expanded="false">HELP STEWARD</button>' +
        '</div>' +
        '<p class="action-note num" id="action-note">' + esc(D.actionNotes.market) + '</p>' +
      '</div>' +
    '</div>';

    $('#detail-root').querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', () => toggleAction(btn.dataset.action, cell));
    });
    preserveOpenAction();

    renderBuildLog(cell);
    renderLedger(cell);
    renderSwitchEvent(cell);
  }

  /* ---------- lower sections ---------- */

  function renderBuildLog(cell) {
    $('#build-log').innerHTML = cell.buildLog.map((e) => (
      '<article class="log-item">' +
        '<div class="log-head">' +
          '<span class="num">' + esc(e.date) + '</span>' +
          '<strong>' + esc(e.change) + '</strong>' +
        '</div>' +
        '<dl class="log-fields">' +
          '<dt>Hypothesis tested</dt><dd>' + esc(e.hypothesis) + '</dd>' +
          '<dt>Owner</dt><dd>' + esc(e.owner) + '</dd>' +
          '<dt>How to try</dt><dd>' + esc(e.howToTry) + '</dd>' +
          '<dt>Cost truth</dt><dd>' + esc(e.cost) + '</dd>' +
          (e.failed ? '<dt>What failed</dt><dd>' + esc(e.failed) + '</dd>' : '') +
          '<dt>Decision next</dt><dd>' + esc(e.decision) + '</dd>' +
        '</dl>' +
      '</article>'
    )).join('');
  }

  function surplusOf(ledger) {
    const rev = ledger.revenue.reduce((s, x) => s + x.amount, 0);
    const cost = ledger.costs.reduce((s, x) => s + x.amount, 0);
    return rev - cost;
  }

  function renderLedger(cell) {
    const l = cell.ledger;
    const money = (n) => n < 0 ? '−$' + fmt(-n) : '$' + fmt(n);
    let html = '<caption style="caption-side:top;text-align:left;padding-bottom:6px;" class="kicker">' +
      esc(l.month).toUpperCase() + ' · ' + esc(l.currency) + '</caption>' +
      '<thead><tr><th scope="col">Line item</th><th scope="col" class="n">Amount</th></tr></thead><tbody>';
    l.revenue.forEach((r) => {
      html += '<tr><td>Revenue · ' + esc(r.source) + '</td><td class="n">' + money(r.amount) + '</td></tr>';
    });
    l.costs.forEach((r) => {
      html += '<tr><td>' + esc(r.item) + '</td><td class="n">' + money(-r.amount) + '</td></tr>';
    });
    html += '<tr><td>Required reserve held (not spendable)</td><td class="n">$' + fmt(l.reserve) + '</td></tr>';
    html += '<tr class="surplus"><td>Surplus this month</td>' +
      '<td class="n">' + money(surplusOf(l)) + '</td></tr>';
    html += '</tbody>';
    $('#ledger-table').innerHTML = html;
  }

  function renderSwitchEvent(cell) {
    const section = $('#switch-section');
    if (!cell.switchEvent) { section.hidden = true; return; }
    section.hidden = false;
    const ev = cell.switchEvent;
    $('#switch-event').innerHTML =
      '<div class="side-box" style="max-width:720px;">' +
        '<p class="kicker" style="margin-bottom:8px;">' + esc(ev.district).toUpperCase() + '</p>' +
        '<dl class="log-fields">' +
          '<dt>Switch window</dt><dd class="num">' + esc(ev.windowStart) + ' → ' + esc(ev.windowEnd) + '</dd>' +
          '<dt>Support coverage</dt><dd>' + esc(ev.support) + '</dd>' +
          '<dt>Rollback path</dt><dd>' + esc(ev.rollback) + '</dd>' +
        '</dl>' +
        '<div style="margin-top:12px;">' +
          ev.thresholds.map((t) =>
            '<div class="cond">' +
              '<span class="cond-label num">' + esc(t.label) + '</span>' +
              '<span>' + statusChip(t.current >= t.target ? 'verified' : 'progress') + '</span>' +
              '<span class="cond-meta num">' + bar(t.current, t.target) + '<span>' + fmt(t.current) + ' / ' + fmt(t.target) + '</span></span>' +
            '</div>'
          ).join('') +
        '</div>' +
        '<p class="form-ok" style="margin-top:10px;">SWITCH IS SCHEDULED ONLY IF EVERY DECLARED GATE PASSES.</p>' +
      '</div>';
  }

  /* ---------- action panels ---------- */

  function setNote(key) {
    $('#action-note').textContent = D.actionNotes[key] || D.actionNotes.market;
  }

  function closeAction() {
    openActionId = null;
    $('#action-panel-root').innerHTML = '';
    $('#detail-root').querySelectorAll('.action-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    setNote('market');
  }

  function toggleAction(actionId, cell) {
    const btn = $('#detail-root').querySelector('[data-action="' + actionId + '"]');
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    closeAction();
    if (isOpen) return;
    openActionId = actionId;
    btn.setAttribute('aria-expanded', 'true');
    setNote(actionId);
    renderPanel(actionId, cell);
    const first = $('#action-panel-root').querySelector('input, select, textarea, button');
    if (first) setTimeout(() => first.focus(), 0);
  }

  function preserveOpenAction() {
    if (!openActionId) return;
    const b = $('#detail-root').querySelector('[data-action="' + openActionId + '"]');
    if (b) b.setAttribute('aria-expanded', 'true');
    setNote(openActionId);
  }

  function panelShell(title, inner) {
    return '<div class="action-panel"><p class="kicker" style="margin-bottom:10px;">' + esc(title) + '</p>' + inner + '</div>';
  }

  function renderPanel(actionId, cell) {
    const root = $('#action-panel-root');
    if (actionId === 'try') renderTryPanel(root, cell);
    else if (actionId === 'commit') renderCommitPanel(root, cell);
    else if (actionId === 'bring') renderBringPanel(root, cell);
    else if (actionId === 'contribute') renderContributePanel(root, cell);
    else if (actionId === 'steward') renderStewardPanel(root, cell);
  }

  /* --- TRY TODAY'S BUILD --- */
  function renderTryPanel(root, cell) {
    const doneCount = S.tasksDone(cell.id, cell.buildSteps.length);
    const complete = doneCount >= cell.buildSteps.length;
    const alreadyFiled = S.hasReceipt(cell.id, 'test-evidence', S.taskKey(cell.id));

    root.innerHTML = panelShell('TRY TODAY’S BUILD — REAL TASKS ONLY',
      cell.buildSteps.map((step, i) => {
        const doneToday = (S.state.tasks[S.taskKey(cell.id)] || []).indexOf(i) >= 0;
        return '<label class="steps"><input type="checkbox" data-step="' + i + '"' +
          (doneToday ? ' checked' : '') + '> <span>' + esc(step) + '</span></label>';
      }).join('') +
      '<div class="bar" style="margin:10px 0;"><i style="width:' + Math.round((doneCount / cell.buildSteps.length) * 100) + '%"></i></div>' +
      '<p id="try-status" class="' + (complete ? 'form-ok' : '') + '">' +
        (complete
          ? (alreadyFiled ? 'EVIDENCE RECEIPT FILED FOR TODAY. THANK YOU.' : '')
          : doneCount + ' OF ' + cell.buildSteps.length + ' STEPS DONE') +
      '</p>'
    );

    root.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.addEventListener('change', () => {
        const arr = S.toggleTask(cell.id, Number(box.dataset.step));
        const done = arr.filter((i) => i < cell.buildSteps.length).length;
        const all = done >= cell.buildSteps.length;
        const filed = S.hasReceipt(cell.id, 'test-evidence', S.taskKey(cell.id));
        if (all && !filed) {
          S.addReceipt({
            cellId: cell.id, type: 'test-evidence',
            detail: 'Completed all ' + cell.buildSteps.length + ' build tasks for today’s version'
          });
        }
        renderPanel('try', cell);
      });
    });
  }

  /* --- COMMIT MY GROUP (Together Pledge) --- */
  const PLEDGE_CONDITIONS = [
    { id: 'archive-import',   label: 'Archive import is independently verified' },
    { id: 'moderators',       label: 'Named moderators accept stewardship before switch' },
    { id: 'reliability',      label: 'A two-week trial reaches the agreed reliability threshold' },
    { id: 'price-cap',        label: 'Published price/cost model is honored (no surprise pricing)' },
    { id: 'export-guarantee', label: 'Complete export stays possible at any time' }
  ];

  function myPledgesTable(cell) {
    const pledges = S.pledgesFor(cell.id);
    if (!pledges.length) return '';
    return '<table class="data" style="margin-top:14px;"><thead><tr>' +
      '<th scope="col">Group</th><th scope="col" class="n">Members</th><th scope="col" class="n">Threshold</th>' +
      '<th scope="col">Expires</th><th scope="col">Status</th><th scope="col"></th></tr></thead><tbody>' +
      pledges.map((p) => {
        const counts = S.pledgeCounts(p);
        return '<tr>' +
          '<td>' + esc(p.groupName) + '</td>' +
          '<td class="n">' + fmt(p.members) + '</td>' +
          '<td class="n">' + fmt(p.threshold) + '</td>' +
          '<td class="num">' + esc(p.expires) + '</td>' +
          '<td>' + (p.status === 'withdrawn' ? 'WITHDRAWN' : counts ? 'ACTIVE' : 'EXPIRED') + '</td>' +
          '<td>' + (p.status === 'active'
            ? '<button class="btn" type="button" data-withdraw="' + p.id + '" style="min-height:24px;padding:2px 8px;">WITHDRAW</button>'
            : '') + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function renderCommitPanel(root, cell) {
    const defaultExpiry = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    root.innerHTML = panelShell('THE TOGETHER PLEDGE — A CONDITIONAL COMMITMENT',
      '<p style="margin:0 0 12px;font-size:13px;color:var(--muted-foreground);">“I will move our group when these conditions are met, this many people also commit, and the expiry hasn’t passed.” Withdraw any time before activation.</p>' +
      '<form id="pledge-form" novalidate>' +
        '<div class="row2">' +
          '<label class="field"><span>Group name</span><input type="text" name="groupName" required maxlength="80" placeholder="e.g., Maple St. book club"></label>' +
          '<label class="field"><span>Members in group</span><input type="number" name="members" required min="2" max="100000" placeholder="420"></label>' +
        '</div>' +
        '<div class="row2">' +
          '<label class="field"><span>Participation threshold (people)</span><input type="number" name="threshold" required min="1" placeholder="auto: 30%"></label>' +
          '<label class="field"><span>Pledge expiry</span><input type="date" name="expires" required value="' + defaultExpiry + '"></label>' +
        '</div>' +
        '<fieldset style="border:0;padding:0;margin:0 0 10px;">' +
          '<legend class="kicker" style="margin-bottom:4px;">Required conditions (choose at least two)</legend>' +
          PLEDGE_CONDITIONS.map((c) =>
            '<label class="checkline"><input type="checkbox" name="cond" value="' + c.id + '"> <span>' + esc(c.label) + '</span></label>'
          ).join('') +
        '</fieldset>' +
        '<button class="btn btn-primary" type="submit">FILE CONDITIONAL PLEDGE</button>' +
        '<p class="form-error" id="pledge-error" hidden></p>' +
        '<p class="form-ok" id="pledge-ok" hidden></p>' +
      '</form>' +
      '<div id="my-pledges">' + myPledgesTable(cell) + '</div>'
    );

    const form = $('#pledge-form');
    const membersInput = form.elements.members;
    const thresholdInput = form.elements.threshold;
    membersInput.addEventListener('input', () => {
      const m = parseInt(membersInput.value, 10);
      if (m > 1) thresholdInput.placeholder = 'auto: ' + Math.ceil(m * 0.3);
    });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const err = $('#pledge-error'); const ok = $('#pledge-ok');
      err.hidden = true; ok.hidden = true;

      const groupName = form.elements.groupName.value.trim();
      const members = parseInt(form.elements.members.value, 10);
      let threshold = parseInt(form.elements.threshold.value, 10);
      if (!threshold && members > 1) threshold = Math.ceil(members * 0.3);
      const expires = form.elements.expires.value;
      const conds = Array.from(form.querySelectorAll('input[name="cond"]:checked')).map((x) => x.value);

      if (!groupName) { err.textContent = 'Name your group.'; err.hidden = false; return; }
      if (!(members >= 2)) { err.textContent = 'A bounded cohort needs at least 2 people.'; err.hidden = false; return; }
      if (!(threshold >= 1)) { err.textContent = 'Set a participation threshold.'; err.hidden = false; return; }
      if (!expires) { err.textContent = 'Every pledge needs an expiry date.'; err.hidden = false; return; }
      if (conds.length < 2) { err.textContent = 'Choose at least two conditions — vague pledges don’t activate.'; err.hidden = false; return; }

      S.addPledge({ cellId: cell.id, groupName, members, threshold, expires, conditions: conds });
      ok.textContent = 'PLEDGE FILED. IT ACTIVATES ONLY WHEN YOUR GROUP USES THE PRODUCT AND ALL CONDITIONS VERIFY.';
      ok.hidden = false;
      form.reset();
      $('#my-pledges').innerHTML = myPledgesTable(cell);
      bindWithdrawButtons(cell);
      renderDetail(cell); // refresh progress bars (local pledges count toward unlocks)
    });

    bindWithdrawButtons(cell);
  }
  function bindWithdrawButtons(cell) {
    document.querySelectorAll('[data-withdraw]').forEach((btn) => {
      btn.addEventListener('click', () => {
        S.setPledgeStatus(btn.dataset.withdraw, 'withdrawn');
        $('#my-pledges').innerHTML = myPledgesTable(cell);
        bindWithdrawButtons(cell);
        renderDetail(cell);
      });
    });
  }

  /* --- BRING MY PEOPLE --- */
  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'cohort';
  }
  function renderBringPanel(root, cell) {
    root.innerHTML = panelShell('BRING MY PEOPLE — BOUNDED COHORTS ONLY',
      '<p style="margin:0 0 12px;font-size:13px;color:var(--muted-foreground);">No contact scraping, ever. You define a bounded cohort and share its code yourself. Adoption credit vests only when invited people become retained users.</p>' +
      '<form id="cohort-form" novalidate>' +
        '<div class="row2">' +
          '<label class="field"><span>Cohort name</span><input type="text" name="name" required maxlength="60" placeholder="e.g., Tuesday run club"></label>' +
          '<label class="field"><span>Expected size</span><input type="number" name="size" required min="2" max="5000" placeholder="35"></label>' +
        '</div>' +
        '<button class="btn btn-primary" type="submit">CREATE COHORT CODE</button>' +
        '<p class="form-error" id="cohort-error" hidden></p>' +
      '</form>' +
      '<div id="my-cohorts">' + myCohortsHtml(cell) + '</div>'
    );

    $('#cohort-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const form = ev.target;
      const err = $('#cohort-error'); err.hidden = true;
      const name = form.elements.name.value.trim();
      const size = parseInt(form.elements.size.value, 10);
      if (!name) { err.textContent = 'Name your cohort.'; err.hidden = false; return; }
      if (!(size >= 2)) { err.textContent = 'A bounded cohort needs at least 2 people.'; err.hidden = false; return; }
      S.addCohort({ cellId: cell.id, name, size, slug: slugify(name) });
      S.addReceipt({ cellId: cell.id, type: 'captain-cohort', detail: 'Founded cohort “' + name + '” (size ' + size + ') — credit vests on retained users, not creation' });
      form.reset();
      $('#my-cohorts').innerHTML = myCohortsHtml(cell);
      bindCopyButtons($('#my-cohorts'));
    });
    bindCopyButtons(root);
  }
  function cohortShareText(cell, c) {
    const base = (location.origin && location.origin !== 'null')
      ? location.origin + location.pathname
      : location.href.split('#')[0];
    return 'Join me in moving “' + c.name + '” to OURS cell ' + cellById(c.cellId).num +
      '. Cohort code: ' + c.code + ' — ' + base + '#/cell/' + c.cellId;
  }
  function myCohortsHtml(cell) {
    const cohorts = S.cohortsFor(cell.id);
    if (!cohorts.length) return '';
    return cohorts.map((c) =>
      '<div class="mandate">' +
        '<strong>' + esc(c.name) + '</strong> <span class="num" style="color:var(--muted-foreground);">· ' + fmt(c.size) + ' expected · CODE ' + esc(c.code) + '</span>' +
        '<textarea readonly rows="2" data-share style="width:100%;margin-top:6px;background:var(--background);border:1px solid var(--border-strong);border-radius:4px;padding:6px;font-family:var(--font-mono);font-size:11px;color:inherit;">' + esc(cohortShareText(cell, c)) + '</textarea>' +
        '<button class="btn" type="button" data-copy style="margin-top:4px;min-height:26px;">COPY INVITE TEXT</button>' +
        '<span class="form-ok" data-copied hidden>COPIED.</span>' +
      '</div>'
    ).join('');
  }
  function bindCopyButtons(root) {
    root.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ta = btn.parentElement.querySelector('[data-share]');
        if (!ta) return;
        ta.select();
        const done = () => { const okEl = btn.parentElement.querySelector('[data-copied]'); if (okEl) okEl.hidden = false; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, done);
        else { try { document.execCommand('copy'); } catch (e) { /* noop */ } done(); }
      });
    });
  }

  /* --- CONTRIBUTE --- */
  function renderContributePanel(root, cell) {
    root.innerHTML = panelShell('CONTRIBUTE — WORK, KNOWLEDGE, OR CAPITAL',
      '<form id="contribute-form" novalidate>' +
        '<label class="field"><span>Type of contribution</span>' +
          '<select name="ctype">' +
            '<option value="testing">Testing &amp; evidence</option>' +
            '<option value="documentation">Documentation</option>' +
            '<option value="migration">Migration work</option>' +
            '<option value="expertise">Domain expertise</option>' +
            '<option value="capital">Capital (pilot dues / preorders)</option>' +
          '</select></label>' +
        '<label class="field"><span>What will you do? (scope + timing)</span>' +
          '<textarea name="note" required maxlength="500" placeholder="e.g., I can run the import rehearsal scripts the weekend of Sept 5"></textarea></label>' +
        '<button class="btn btn-primary" type="submit">FILE CONTRIBUTION INTENT</button>' +
        '<p class="form-error" id="contrib-error" hidden></p>' +
      '</form>' +
      '<p style="margin:10px 0 0;font-size:12px;color:var(--muted-foreground);">Receipts record work and outcome. They are never tradeable and never change governance power.</p>'
    );
    $('#contribute-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const form = ev.target;
      const err = $('#contrib-error'); err.hidden = true;
      const note = form.elements.note.value.trim();
      if (note.length < 8) { err.textContent = 'Describe the contribution briefly — vague offers can’t verify.'; err.hidden = false; return; }
      S.addReceipt({ cellId: cell.id, type: 'contribution-' + form.elements.ctype.value, detail: note });
      form.elements.note.value = '';
      err.hidden = true;
      const ok = document.createElement('p');
      ok.className = 'form-ok';
      ok.textContent = 'RECEIPT FILED. A STEWARD WILL MATCH IT TO NAMED WORK.';
      form.appendChild(ok);
    });
  }

  /* --- HELP STEWARD --- */
  function renderStewardPanel(root, cell) {
    const filedMandates = S.state.receipts
      .filter((r) => r.cellId === cell.id && r.type === 'steward')
      .map((r) => r.detail.mandate || r.detail);
    root.innerHTML = panelShell('HELP STEWARD — NAMED, REVIEWABLE RESPONSIBILITY',
      cell.mandates.length
        ? cell.mandates.map((m, i) =>
          '<div class="mandate">' +
            '<strong>' + esc(m.name) + '</strong>' +
            '<p style="margin:4px 0;font-size:13px;">' + esc(m.duties) + '</p>' +
            '<p class="kicker" style="margin-bottom:6px;">' + esc(m.review).toUpperCase() + '</p>' +
            (filedMandates.indexOf(m.name) >= 0
              ? '<span class="form-ok">ACCEPTED — YOU HOLD THIS MANDATE UNTIL REVIEW.</span>'
              : '<button class="btn" type="button" data-mandate="' + i + '" style="min-height:28px;">ACCEPT THIS MANDATE</button>') +
          '</div>'
        ).join('')
        : '<p class="empty-note">No named mandates are open in this cell yet — that is itself evidence: no steward, no advancement.</p>'
    );
    root.querySelectorAll('[data-mandate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mandate = cell.mandates[Number(btn.dataset.mandate)];
        S.addReceipt({ cellId: cell.id, type: 'steward', detail: { mandate: mandate.name, duties: mandate.duties } });
        renderStewardPanel(root, cell);
      });
    });
  }

  /* ---------- receipts view ---------- */

  function renderReceiptsView() {
    const st = S.state;

    // Receipts table
    $('#receipts-table').innerHTML = !st.receipts.length
      ? '<caption style="caption-side:top;text-align:left;" class="empty-note">No receipts yet. Try a build task or file a contribution from any cell.</caption>'
      : '<thead><tr><th scope="col">When</th><th scope="col">Cell</th><th scope="col">Type</th><th scope="col">Detail</th></tr></thead><tbody>' +
        st.receipts.map((r) => {
          const d = typeof r.detail === 'string' ? r.detail
            : r.detail && r.detail.mandate ? 'Mandate accepted: ' + r.detail.mandate
            : JSON.stringify(r.detail);
          const cell = cellById(r.cellId);
          return '<tr><td class="num">' + esc(r.ts.slice(0, 16).replace('T', ' ')) + '</td>' +
            '<td>' + esc(cell.num + ' · ' + cell.title) + '</td>' +
            '<td class="num">' + esc(r.type.toUpperCase()) + '</td>' +
            '<td>' + esc(d) + '</td></tr>';
        }).join('') + '</tbody>';

    // Pledges table
    const allPledges = st.pledges;
    $('#pledges-table').innerHTML = !allPledges.length
      ? '<caption style="caption-side:top;text-align:left;" class="empty-note">No Together Pledges yet. Open a cell and choose “Commit my group”.</caption>'
      : '<thead><tr><th scope="col">Group</th><th scope="col">Cell</th><th scope="col" class="n">Members</th><th scope="col" class="n">Threshold</th><th scope="col">Expires</th><th scope="col">Conditions</th><th scope="col">Status</th></tr></thead><tbody>' +
        allPledges.map((p) => {
          const cell = cellById(p.cellId);
          const status = p.status === 'withdrawn' ? 'WITHDRAWN' : S.pledgeCounts(p) ? 'ACTIVE' : 'EXPIRED';
          return '<tr><td>' + esc(p.groupName) + '</td><td>' + esc(cell.num) + '</td>' +
            '<td class="n">' + fmt(p.members) + '</td><td class="n">' + fmt(p.threshold) + '</td>' +
            '<td class="num">' + esc(p.expires) + '</td>' +
            '<td class="num">' + esc((p.conditions || []).join(', ').toUpperCase()) + '</td>' +
            '<td>' + status + '</td></tr>';
        }).join('') + '</tbody>';

    // Cohorts table
    const allCohorts = st.cohorts;
    $('#cohorts-table').innerHTML = !allCohorts.length
      ? '<caption style="caption-side:top;text-align:left;" class="empty-note">No cohorts yet. Open a cell and choose “Bring my people”.</caption>'
      : '<thead><tr><th scope="col">Cohort</th><th scope="col">Cell</th><th scope="col" class="n">Size</th><th scope="col">Code</th></tr></thead><tbody>' +
        allCohorts.map((c) => '<tr><td>' + esc(c.name) + '</td><td>' + esc(cellById(c.cellId).num) + '</td>' +
          '<td class="n">' + fmt(c.size) + '</td><td class="num">' + esc(c.code) + '</td></tr>').join('') + '</tbody>';
  }

  function initRecordsActions() {
    $('#export-btn').addEventListener('click', () => S.exportJson());

    const wipeBtn = $('#wipe-btn');
    let armed = false; let timer = null;
    wipeBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        wipeBtn.textContent = 'CLICK AGAIN TO CONFIRM DELETE';
        timer = setTimeout(() => { armed = false; wipeBtn.textContent = 'DELETE ALL LOCAL DATA'; }, 4000);
        return;
      }
      clearTimeout(timer);
      S.wipe();
      armed = false;
      wipeBtn.textContent = 'DELETE ALL LOCAL DATA';
      renderReceiptsView();
    });
  }

  /* ---------- routing ---------- */

  function parseRoute() {
    const h = location.hash || '#/';
    const cellMatch = h.match(new RegExp('^#/cell/([a-z0-9-]+)'));
    if (cellMatch) return { view: 'cell', id: cellMatch[1] };
    if (h.indexOf('#/receipts') === 0) return { view: 'receipts' };
    return { view: 'market' };
  }

  function route() {
    const r = parseRoute();
    const market = $('#view-market');
    const receipts = $('#view-receipts');

    if (r.view === 'receipts') {
      market.hidden = true;
      receipts.hidden = false;
      renderReceiptsView();
      return;
    }

    receipts.hidden = true;
    market.hidden = false;
    if (r.view === 'cell' && D.cells.some((c) => c.id === r.id)) {
      selectCell(r.id, { skipHash: true });
    } else if (!selectedCellId) {
      selectCell(D.cells[0].id, { skipHash: true });
    } else {
      markSelection();
    }
  }

  function selectCell(id, opts) {
    selectedCellId = id;
    const cell = cellById(id);
    closeAction();
    markSelection();
    renderDetail(cell);
    if (!(opts && opts.skipHash)) {
      const target = '#/cell/' + id;
      if (location.hash !== target) {
        try { history.pushState(null, '', target); }
        catch (e) { location.hash = target; } // some file:// contexts forbid pushState
      }
    }
    if (!(opts && opts.skipScroll)) {
      const el = $('#detail-root');
      if (el && el.getBoundingClientRect().top > window.innerHeight * 0.7) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  /* ---------- boot ---------- */

  function boot() {
    initTopbar();
    renderEdition();
    renderGrid();
    route();

    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeAction();
    });

    initRecordsActions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
