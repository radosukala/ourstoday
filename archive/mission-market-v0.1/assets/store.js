/* OURS TODAY — local record store.
 *
 * Phase 0 discipline: no accounts, no backend, no network. Participation
 * records (receipts, pledges, cohorts, task evidence) live in localStorage
 * only, and can be exported or wiped at any time — the right to leave
 * applies to us, too.
 */
(function () {
  'use strict';

  const KEY = 'ours-today-local-v1';
  let listeners = [];

  function empty() {
    return { receipts: [], pledges: [], cohorts: [], tasks: {}, prefs: { theme: 'auto' } };
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw);
      return Object.assign(empty(), parsed);
    } catch (e) {
      return empty();
    }
  }

  function save(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable; session-only mode */ }
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) { /* listener error must not break the store */ }
    });
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  const store = {
    KEY: KEY,

    get state() { return load(); },

    subscribe(fn) { listeners.push(fn); },

    /* ---- receipts ---- */
    addReceipt(entry) {
      const s = load();
      const r = Object.assign({ id: uid('r'), ts: new Date().toISOString() }, entry);
      s.receipts.unshift(r);
      save(s);
      return r;
    },
    hasReceipt(cellId, type, dayKey) {
      return load().receipts.some(function (r) {
        return r.cellId === cellId && r.type === type && (!dayKey || r.dayKey === dayKey);
      });
    },

    /* ---- together pledges ---- */
    addPledge(p) {
      const s = load();
      const pledge = Object.assign({
        id: uid('p'),
        createdAt: new Date().toISOString(),
        status: 'active',
        withdrawnAt: null
      }, p);
      s.pledges.unshift(pledge);
      save(s);
      return pledge;
    },
    setPledgeStatus(id, status) {
      const s = load();
      const p = s.pledges.find(function (x) { return x.id === id; });
      if (!p) return null;
      p.status = status;
      p.withdrawnAt = status === 'withdrawn' ? new Date().toISOString() : null;
      save(s);
      return p;
    },
    /* A pledge counts only while active and unexpired — expiry is honored, not decorative. */
    pledgeCounts(p) {
      return p.status === 'active' && new Date(p.expires + 'T23:59:59') > new Date();
    },
    pledgesFor(cellId) {
      return load().pledges.filter(function (p) { return p.cellId === cellId; });
    },
    localPledgeMembers(cellId) {
      return this.pledgesFor(cellId)
        .filter(this.pledgeCounts)
        .reduce(function (sum, p) { return sum + Number(p.members || 0); }, 0);
    },

    /* ---- cohorts (captain tools) ---- */
    addCohort(c) {
      const s = load();
      const cohort = Object.assign({ id: uid('c'), code: c.slug + '-' + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString() }, c);
      s.cohorts.unshift(cohort);
      save(s);
      return cohort;
    },
    cohortsFor(cellId) {
      return load().cohorts.filter(function (c) { return !cellId || c.cellId === cellId; });
    },

    /* ---- build-task evidence ---- */
    taskKey(cellId) {
      return cellId + ':' + new Date().toISOString().slice(0, 10);
    },
    toggleTask(cellId, index) {
      const s = load();
      const k = this.taskKey(cellId);
      s.tasks[k] = s.tasks[k] || [];
      const arr = s.tasks[k];
      const i = arr.indexOf(index);
      if (i >= 0) arr.splice(i, 1); else arr.push(index);
      save(s);
      return arr;
    },
    tasksDone(cellId, stepCount) {
      const s = load();
      const done = s.tasks[this.taskKey(cellId)] || [];
      return done.filter(function (i) { return i < stepCount; }).length;
    },

    /* ---- theme preference ---- */
    setTheme(theme) {
      const s = load();
      s.prefs.theme = theme;
      save(s);
    },

    /* ---- right to leave ---- */
    exportJson() {
      const s = load();
      const payload = {
        schema: 'ourstoday.local.export/v1',
        exportedAt: new Date().toISOString(),
        origin: location.href,
        notice: 'Local participation records only. Concept data is excluded by design; it was never yours to export.',
        data: { receipts: s.receipts, pledges: s.pledges, cohorts: s.cohorts, tasks: s.tasks }
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ourstoday-export-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    },
    wipe() {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* noop */ }
      save(empty());
    }
  };

  window.OURS_STORE = store;
})();
