/* Money Buddies: a personal finance PWA. All data stays on the device. */
(() => {
  'use strict';

  // ---------- storage ----------
  const KEY = 'mb.v1';
  const DEFAULT_STATE = {
    settings: {
      currency: '$',
      payAmount: 0,
      payFreq: 'weekly',       // weekly | biweekly | monthly
      payAnchor: '',           // a date you were (or will be) paid, YYYY-MM-DD
      weeklyBudget: 250,
      defaultReminders: [1, 3],
      notify: false
    },
    bills: [],      // {id, name, amount, type:'monthly'|'once', day, date, reminders:[n], paid:{'YYYY-MM':true}}
    goals: [],      // {id, name, target, color}
    deposits: [],   // {id, goalId, amount, date}
    spends: [],     // {id, name, amount, cat, date}
    income: [],     // extra income: {id, name, amount, date}
    sent: {}        // notification keys already shown
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const s = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...s, settings: { ...DEFAULT_STATE.settings, ...(s.settings || {}) } };
    } catch (e) { return structuredClone(DEFAULT_STATE); }
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save on this device'); }
    mirrorToIDB();
  }
  // The service worker cannot read localStorage, so keep a copy in IndexedDB for background checks.
  function mirrorToIDB() {
    try {
      const req = indexedDB.open('mb', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        const tx = req.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(JSON.stringify(S), 'state');
      };
    } catch (e) { /* optional */ }
  }

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const diffDays = (a, b) => Math.round((b - a) / 86400000);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const short = (d) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  const nice = (d) => `${DOW[d.getDay()]}, ${short(d)}`;
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const money = (n, opts = {}) => {
    const neg = n < 0; const v = Math.abs(n);
    const s = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 && !opts.round ? 2 : 0, maximumFractionDigits: opts.round ? 0 : 2 });
    return (neg ? '−' : '') + S.settings.currency + s;
  };
  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
  const sum = (arr, f = (x) => x.amount) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
  const TINTS = ['#E3E6FB', '#DDF3EC', '#FFE4D6', '#FFF1C7', '#F6E1F5'];
  const tint = (s) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

  // ---------- mascots ----------
  // Animated tab characters live in mascots.js / mascots.css.
  const M = { billy: (s) => MBM.bills(s), sprout: (s) => MBM.savings(s), swipe: (s) => MBM.debit(s), wally: (s) => MBM.summary(s) };
  const ICON = {
    bell: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  };

  // ---------- domain ----------
  function dueIn(bill, y, m) {
    if (bill.type === 'once') {
      if (!bill.date) return null;
      const d = parse(bill.date);
      return d.getFullYear() === y && d.getMonth() === m ? d : null;
    }
    return new Date(y, m, Math.min(bill.day || 1, daysIn(y, m)));
  }
  const isPaid = (bill, d) => !!(bill.paid && bill.paid[ym(d)]);
  function billsForMonth(y, m) {
    return S.bills.map((b) => ({ b, due: dueIn(b, y, m) })).filter((x) => x.due).sort((a, z) => a.due - z.due);
  }
  function status(b, due) {
    if (isPaid(b, due)) return { cls: 'paid', text: due > today() ? 'Paid early' : 'Paid' };
    const n = diffDays(today(), due);
    if (n < 0) return { cls: 'late', text: n === -1 ? '1 day late' : `${-n} days late` };
    if (n === 0) return { cls: 'soon', text: 'Today' };
    if (n === 1) return { cls: 'soon', text: 'Tomorrow' };
    if (n <= 3) return { cls: 'soon', text: `In ${n} days` };
    return { cls: 'later', text: short(due) };
  }
  function paydaysBetween(start, end) {
    const { payFreq, payAnchor, payAmount } = S.settings;
    const out = [];
    if (!payAnchor || !payAmount) return out;
    const a = parse(payAnchor);
    if (payFreq === 'monthly') {
      for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        const p = new Date(d.getFullYear(), d.getMonth(), Math.min(a.getDate(), daysIn(d.getFullYear(), d.getMonth())));
        if (p >= start && p <= end) out.push(p);
      }
      return out;
    }
    const step = payFreq === 'biweekly' ? 14 : 7;
    let k = Math.ceil(diffDays(a, start) / step);
    for (let d = addDays(a, k * step); d <= end; d = addDays(d, step)) if (d >= start) out.push(d);
    return out;
  }
  const inRange = (s, a, b) => { const d = parse(s); return d >= a && d <= b; };
  function weeksOfMonth(y, m) {
    const weeks = []; const last = new Date(y, m, daysIn(y, m));
    let start = new Date(y, m, 1);
    while (start <= last) {
      const toSun = (7 - start.getDay()) % 7; // weeks run Monday to Sunday
      const end = addDays(start, toSun) > last ? last : addDays(start, toSun);
      weeks.push({ start, end });
      start = addDays(end, 1);
    }
    return weeks;
  }
  function currentWeek() {
    const t = today(); const back = (t.getDay() + 6) % 7;
    const start = addDays(t, -back); return { start, end: addDays(start, 6) };
  }

  // ---------- reminders ----------
  function pendingReminders() {
    const t = today(); const out = [];
    for (let i = -1; i <= 1; i++) {
      const base = new Date(t.getFullYear(), t.getMonth() + i, 1);
      for (const { b, due } of billsForMonth(base.getFullYear(), base.getMonth())) {
        if (isPaid(b, due) || due < t) continue;
        for (const n of (b.reminders || [])) {
          if (diffDays(t, due) <= n) out.push({ key: `${b.id}|${ymd(due)}|${n}`, b, due, n });
        }
      }
    }
    return out;
  }
  async function runReminders() {
    if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    let changed = false;
    // Show one notification per bill: the nearest reminder that has not been shown yet.
    const seen = new Set();
    for (const r of pendingReminders()) {
      if (S.sent[r.key] || seen.has(r.b.id + ymd(r.due))) continue;
      seen.add(r.b.id + ymd(r.due));
      const days = diffDays(today(), r.due);
      const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days (${nice(r.due)})`;
      const body = `${r.b.name}: ${money(r.b.amount)} is due ${when}.`;
      try {
        if (reg) await reg.showNotification('Billy says heads up!', { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: r.b.id + ymd(r.due) });
        else new Notification('Billy says heads up!', { body });
      } catch (e) { /* ignore */ }
      for (const x of pendingReminders()) if (x.b.id === r.b.id && ymd(x.due) === ymd(r.due)) S.sent[x.key] = 1;
      changed = true;
    }
    if (changed) save();
  }

  // ---------- calendar export ----------
  function icsFor(bills) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const line = (s) => s.replace(/([,;\\])/g, '\\$1');
    const ev = [];
    for (const b of bills) {
      let dt, rule = '';
      if (b.type === 'once') { if (!b.date) continue; dt = parse(b.date); }
      else { const t = today(); dt = new Date(t.getFullYear(), t.getMonth(), Math.min(b.day, daysIn(t.getFullYear(), t.getMonth()))); rule = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${b.day >= 31 ? -1 : b.day}`; }
      const d0 = ymd(dt).replace(/-/g, ''); const d1 = ymd(addDays(dt, 1)).replace(/-/g, '');
      const alarms = (b.reminders || []).map((n) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${line(b.name)} due`, (n === 0 ? 'TRIGGER:PT9H' : `TRIGGER:-P${n - 1}DT15H`), 'END:VALARM'].join('\r\n'));
      ev.push(['BEGIN:VEVENT', `UID:${b.id}@money-buddies`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d0}`, `DTEND;VALUE=DATE:${d1}`, rule, `SUMMARY:${line(`${b.name} due (${money(b.amount)})`)}`, ...alarms, 'END:VEVENT'].filter(Boolean).join('\r\n'));
    }
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Money Buddies//EN', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- UI state ----------
  let tab = 'bills';
  try { tab = localStorage.getItem('mb.tab') || 'bills'; } catch (e) { /* ignore */ }
  let viewMonth = (() => { const t = today(); return new Date(t.getFullYear(), t.getMonth(), 1); })();
  let billFilter = 'all';

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function monthNav() {
    return `<span class="month-nav"><button type="button" data-act="prev-month" aria-label="Previous month">${ICON.left}</button>${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}<button type="button" data-act="next-month" aria-label="Next month">${ICON.right}</button></span>`;
  }

  // ---------- views ----------
  function viewBills() {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const all = billsForMonth(y, m);
    const total = sum(all, (x) => x.b.amount);
    const paid = sum(all.filter((x) => isPaid(x.b, x.due)), (x) => x.b.amount);
    const nPaid = all.filter((x) => isPaid(x.b, x.due)).length;
    const pct = total ? Math.round((paid / total) * 100) : 0;
    const t = today();
    const nm = new Date(t.getFullYear(), t.getMonth() + 1, 1);
    const next = billsForMonth(t.getFullYear(), t.getMonth()).concat(billsForMonth(nm.getFullYear(), nm.getMonth()))
      .filter((x) => !isPaid(x.b, x.due) && diffDays(t, x.due) <= 3);
    const late = next.filter((x) => x.due < t);
    const shown = all.filter((x) => billFilter === 'all' || (billFilter === 'monthly' ? x.b.type !== 'once' : x.b.type === 'once'));

    let alert = '';
    if (late.length) {
      alert = `<div class="alert red">${ICON.bell}<div><b>${late.length === 1 ? `${esc(late[0].b.name)} is overdue` : `${late.length} bills are overdue`}</b><span>Tap a bill to mark it paid.</span></div></div>`;
    } else if (next.length) {
      const x = next[0]; const n = diffDays(t, x.due);
      alert = `<div class="alert">${ICON.bell}<div><b>${esc(x.b.name)} is due ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`}</b><span>${money(x.b.amount)} on ${nice(x.due)}.${next.length > 1 ? ` Plus ${next.length - 1} more soon.` : ''}</span></div></div>`;
    }

    const list = shown.length ? `<div class="list">${shown.map(({ b, due }) => {
      const st = status(b, due);
      return `<button type="button" class="item" data-act="edit-bill" data-id="${b.id}"><div class="badge" style="background:${tint(b.name)}">${esc(b.name[0]?.toUpperCase() || '?')}</div><div class="main"><b>${esc(b.name)}</b><span>${b.type === 'once' ? `One-time · ${short(due)}` : `Every month · ${ord(b.day)}`}</span></div><div class="side"><b>${money(b.amount)}</b><span class="pill ${st.cls}">${st.text}</span></div></button>`;
    }).join('')}</div>` : `<div class="empty">${M.billy(56)}<b>No bills here yet</b>Add rent, phone, or anything you pay. Billy will remind you before it is due.<button type="button" class="btn accent" data-act="add">Add a bill</button>${S.bills.length ? '' : '<button type="button" class="link-btn" data-act="sample">or try it with sample data</button>'}</div>`;

    return `
      <header class="head"><div><div class="eyebrow">${monthNav()}</div><h1>Monthly bills</h1></div>${M.billy()}</header>
      <section class="hero dark">
        <div class="row"><span class="label">Due this month</span><span class="label">${nPaid} of ${all.length} paid</span></div>
        <div class="big">${money(total, { round: true })}</div>
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Paid so far"><div style="width:${pct}%"></div></div>
        <div class="row"><span>Paid <b>${money(paid, { round: true })}</b></span><span>Still to pay <b style="color:#FFB08C">${money(total - paid, { round: true })}</b></span></div>
      </section>
      ${alert}
      <div class="section-head"><h2>All bills</h2><div class="chips">${['all', 'monthly', 'once'].map((f) => `<button type="button" class="chip" data-act="filter" data-f="${f}" aria-pressed="${billFilter === f}">${{ all: 'All', monthly: 'Monthly', once: 'One-time' }[f]}</button>`).join('')}</div></div>
      ${list}`;
  }

  function viewSavings() {
    const total = sum(S.deposits);
    const thisMonth = sum(S.deposits.filter((d) => d.date.startsWith(ym(today()))));
    const goals = S.goals.map((g) => {
      const saved = sum(S.deposits.filter((d) => d.goalId === g.id));
      const pct = g.target ? Math.min(100, Math.round((saved / g.target) * 100)) : 0;
      const left = Math.max(0, g.target - saved);
      const hint = !g.target ? 'No limit' : left === 0 ? 'Goal reached!' : `${money(left, { round: true })} to go`;
      return `<button type="button" class="goal" data-act="edit-goal" data-id="${g.id}"><div class="jar"><div class="fill" style="height:${Math.max(pct, 4)}%;background:${g.color}"></div><div class="pct">${pct}%</div></div><b>${esc(g.name)}</b><span>${money(saved, { round: true })}${g.target ? ` of ${money(g.target, { round: true })}` : ''}</span><em>${hint}</em></button>`;
    }).join('');
    const recent = [...S.deposits].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    const gname = (id) => S.goals.find((g) => g.id === id)?.name || 'Savings';
    return `
      <header class="head"><div><div class="eyebrow">Your stash</div><h1>Savings</h1></div>${M.sprout()}</header>
      <section class="hero teal">
        <span class="label">Total saved</span>
        <div class="big">${money(total, { round: true })}</div>
        <span style="font-size:14px">${thisMonth > 0 ? `Up <b>${money(thisMonth, { round: true })}</b> this month. Your piggy bank is growing!` : thisMonth < 0 ? `Down ${money(-thisMonth, { round: true })} this month.` : 'Nothing added this month yet.'}</span>
        <div class="hero-actions"><button type="button" data-act="add" style="background:#fff;color:#0B6B5C">Add money</button><button type="button" data-act="add-goal" style="background:#0B6B5C;color:#fff">New goal</button></div>
      </section>
      ${S.goals.length ? `<h2 style="font-size:20px;font-weight:700">Goals</h2><div class="goals">${goals}</div>` : `<div class="empty">${M.sprout(56)}<b>Plant your first goal</b>An emergency fund, a trip, a new phone. Watch the jar fill up.<button type="button" class="btn accent" data-act="add-goal">New goal</button></div>`}
      ${recent.length ? `<h2 style="font-size:20px;font-weight:700">Recent</h2><div class="list">${recent.map((d) => `<button type="button" class="item" data-act="edit-deposit" data-id="${d.id}"><div class="main"><b>${esc(gname(d.goalId))}</b><span>${nice(parse(d.date))}</span></div><b style="color:${d.amount < 0 ? 'var(--red)' : 'var(--teal-deep)'}">${d.amount < 0 ? '' : '+'}${money(d.amount)}</b></button>`).join('')}</div>` : ''}`;
  }

  const CATS = [
    { id: 'groceries', name: 'Groceries', color: '#0E8C7A', tint: '#DDF3EC' },
    { id: 'food', name: 'Food out', color: '#F2662B', tint: '#FFE4D6' },
    { id: 'gas', name: 'Gas', color: '#E0A800', tint: '#FFF1C7' },
    { id: 'fun', name: 'Fun', color: '#5B4BDB', tint: '#E3E6FB' },
    { id: 'shopping', name: 'Shopping', color: '#C026D3', tint: '#F6E1F5' },
    { id: 'other', name: 'Other', color: '#555B73', tint: '#EDF0F6' }
  ];
  const cat = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];

  function viewDebit() {
    const { start, end } = currentWeek();
    const wk = S.spends.filter((s) => inRange(s.date, start, end));
    const spent = sum(wk); const budget = S.settings.weeklyBudget || 0;
    const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    const daysLeft = diffDays(today(), end) + 1;
    const C = 2 * Math.PI * 42;
    const byCat = CATS.map((c) => ({ ...c, amount: sum(wk.filter((s) => (s.cat || 'other') === c.id)) })).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 4);
    const days = {};
    for (const s of [...wk].sort((a, b) => b.date.localeCompare(a.date))) (days[s.date] ||= []).push(s);
    const left = budget - spent;
    return `
      <header class="head"><div><div class="eyebrow">Everyday card spending</div><h1>Debit</h1></div>${M.swipe()}</header>
      <section class="hero violet ring-card">
        <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="${pct} percent of weekly budget spent" style="flex-shrink:0"><circle cx="52" cy="52" r="42" fill="none" stroke="#E8777B" stroke-width="12"/><circle cx="52" cy="52" r="42" fill="none" stroke="${left < 0 ? '#FF9C8F' : '#FFC93C'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * pct) / 100} ${C}" transform="rotate(-90 52 52)"/><text x="52" y="59" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="22" fill="#fff">${pct}%</text></svg>
        <div style="display:flex;flex-direction:column;gap:6px">
          <span class="label">Spent this week</span>
          <div class="big" style="font-size:38px">${money(spent, { round: true })}</div>
          <span style="font-size:14px">${budget ? `of your <b>${money(budget, { round: true })}</b> weekly budget` : '<button type="button" class="link-btn" data-act="settings" style="color:#FFE7A3">Set a weekly budget</button>'}</span>
          ${budget ? `<span style="font-size:13px;color:#fff;font-weight:700">${left >= 0 ? `${money(left, { round: true })} left for ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : `${money(-left, { round: true })} over budget`}</span>` : ''}
        </div>
      </section>
      ${byCat.length ? `<div class="cats">${byCat.map((c) => `<div class="cat"><div class="badge" style="background:${c.tint}">${c.name[0]}</div>${c.name}<b>${money(c.amount, { round: true })}</b></div>`).join('')}</div>` : ''}
      <div class="section-head"><h2>This week</h2><span style="font-size:13px;color:var(--muted)">${short(start)} to ${short(end)}</span></div>
      ${Object.keys(days).length ? Object.entries(days).map(([d, items]) => `<div class="day-head"><span>${ymd(today()) === d ? 'Today · ' : ''}${nice(parse(d))}</span><span>${money(sum(items))}</span></div><div class="list">${items.map((s) => `<button type="button" class="item" data-act="edit-spend" data-id="${s.id}"><span class="dot" style="background:${cat(s.cat).color}"></span><div class="main"><b>${esc(s.name)}</b><span>${cat(s.cat).name}</span></div><b>${money(s.amount)}</b></button>`).join('')}</div>`).join('') : `<div class="empty">${M.swipe(56)}<b>No purchases logged this week</b>Tap + each time you use your card. Swipe keeps the week honest.</div>`}`;
  }

  function viewSummary() {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m, daysIn(y, m));
    const pays = paydaysBetween(first, last);
    const extra = S.income.filter((i) => inRange(i.date, first, last));
    const income = pays.length * S.settings.payAmount + sum(extra);
    const bills = billsForMonth(y, m);
    const billsTotal = sum(bills, (x) => x.b.amount);
    const saved = Math.max(0, sum(S.deposits.filter((d) => inRange(d.date, first, last))));
    const spent = sum(S.spends.filter((s) => inRange(s.date, first, last)));
    const free = income - billsTotal - saved - spent;
    const part = (v) => (income > 0 ? Math.max(0, (v / income) * 100) : 0);
    const t = today();
    const freq = { weekly: 'every week', biweekly: 'every 2 weeks', monthly: 'every month' }[S.settings.payFreq];
    const setupNeeded = !S.settings.payAmount || !S.settings.payAnchor;
    let carry = 0;
    const weeks = weeksOfMonth(y, m).map((w, i) => {
      const wp = pays.filter((p) => p >= w.start && p <= w.end);
      const wx = extra.filter((e) => inRange(e.date, w.start, w.end));
      const inc = wp.length * S.settings.payAmount + sum(wx);
      const wb = bills.filter((x) => x.due >= w.start && x.due <= w.end);
      const left = inc - sum(wb, (x) => x.b.amount);
      const now = t >= w.start && t <= w.end;
      const tip = left < 0 ? `Bills are bigger than this week's pay by ${money(-left, { round: true })}. ${carry > 0 ? `Last week's extra ${money(carry, { round: true })} can cover it.` : 'Put a little aside the week before.'}` : '';
      carry = left;
      return `<div class="week ${now ? 'now' : ''}"><div class="top"><div><b class="t">${now ? 'This week' : `Week ${i + 1}`}</b><small>${short(w.start)}${+w.start !== +w.end ? `–${w.end.getDate()}` : ''} · ${wp.length ? `paid ${wp.map((p) => `${DOW[p.getDay()]} ${p.getDate()}`).join(', ')}` : 'no payday'} · in ${money(inc, { round: true })}</small></div><div style="text-align:right"><small>left after bills</small><span class="left ${left < 0 ? 'neg' : ''}">${money(left, { round: true })}</span></div></div>${wb.length ? `<div class="chips">${wb.map((x) => `<span class="wchip ${isPaid(x.b, x.due) ? 'paid' : ''}">${esc(x.b.name)} ${money(x.b.amount, { round: true })} · ${DOW[x.due.getDay()]} ${x.due.getDate()}</span>`).join('')}</div>` : '<small>No bills due this week</small>'}${tip ? `<span class="tip">${tip}</span>` : ''}</div>`;
    }).join('');
    return `
      <header class="head"><div><div class="eyebrow">${monthNav()}</div><h1>Summary</h1></div>${M.wally()}</header>
      ${setupNeeded ? `<div class="alert" style="background:var(--sun-soft);color:#5C3D00"><div><b>Add your pay to see each week</b><span>Add how much and how often you get paid to split the month by week.</span></div><button type="button" class="btn" data-act="settings" style="height:44px;flex-shrink:0">Set up</button></div>` : ''}
      <section class="hero light">
        <div class="row"><span class="label">Income this month</span><span style="display:flex;gap:8px;align-items:center"><span class="label">${S.settings.payAmount ? `${money(S.settings.payAmount, { round: true })} ${freq}` : ''}</span><button type="button" class="icon-btn" data-act="settings" aria-label="Settings" style="background:var(--bg)">${ICON.gear}</button></span></div>
        <div class="big">${money(income, { round: true })}</div>
        <div class="stack" aria-hidden="true"><div style="width:${part(billsTotal)}%;background:var(--orange)"></div><div style="width:${part(saved)}%;background:var(--teal)"></div><div style="width:${part(spent)}%;background:var(--violet)"></div><div style="width:${part(free)}%;background:var(--sun)"></div></div>
        <div class="legend"><div><i style="background:var(--orange)"></i>Bills<b>${money(billsTotal, { round: true })}</b></div><div><i style="background:var(--teal)"></i>Saved<b>${money(saved, { round: true })}</b></div><div><i style="background:var(--violet)"></i>Spent<b>${money(spent, { round: true })}</b></div><div><i style="background:var(--sun)"></i>${free < 0 ? 'Short' : 'Free'}<b>${money(free, { round: true })}</b></div></div>
        <button type="button" class="link-btn" data-act="add-income" style="align-self:flex-start;color:var(--sun-deep)">+ Add extra income</button>
      </section>
      <h2 style="font-size:20px;font-weight:700">Week by week</h2>
      ${weeks}
      ${extra.length ? `<h2 style="font-size:20px;font-weight:700">Extra income</h2><div class="list">${extra.map((e) => `<button type="button" class="item" data-act="edit-income" data-id="${e.id}"><div class="main"><b>${esc(e.name)}</b><span>${nice(parse(e.date))}</span></div><b style="color:var(--teal-deep)">+${money(e.amount)}</b></button>`).join('')}</div>` : ''}`;
  }

  function render() {
    document.body.dataset.tab = tab;
    document.querySelectorAll('.tabbar button').forEach((b) => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('#fab').setAttribute('aria-label', { bills: 'Add a bill', savings: 'Add money', debit: 'Log a purchase', summary: 'Add' }[tab]);
    $('#view').innerHTML = { bills: viewBills, savings: viewSavings, debit: viewDebit, summary: viewSummary }[tab]();
  }

  // ---------- sheets ----------
  let sheetSubmit = null;
  function openSheet(title, body, onSubmit, opts = {}) {
    const f = $('#sheet');
    f.innerHTML = `<div class="grab"></div><div class="sheet-head"><h2 id="sheet-title">${title}</h2><button type="button" class="link-btn" data-close style="color:var(--muted)">Cancel</button></div>${body}<div class="sheet-actions">${opts.del ? `<button type="button" class="btn danger" data-act="sheet-delete">Delete</button>` : ''}${opts.noSave ? '' : `<button type="submit" class="btn accent">${opts.saveText || 'Save'}</button>`}</div>`;
    sheetSubmit = onSubmit; f._del = opts.del;
    $('#sheet-wrap').hidden = false;
    setTimeout(() => f.querySelector('input:not([type=hidden])')?.focus(), 50);
  }
  function closeSheet() { $('#sheet-wrap').hidden = true; $('#sheet').innerHTML = ''; sheetSubmit = null; }
  const val = (name) => $('#sheet').elements[name]?.value ?? '';

  function segHTML(name, options, current) {
    return `<input type="hidden" name="${name}" value="${current}"><div class="seg ${options.length === 3 ? 'three' : ''}">${options.map(([v, l]) => `<button type="button" data-seg="${name}" data-v="${v}" aria-pressed="${v === current}">${l}</button>`).join('')}</div>`;
  }

  function billSheet(bill) {
    const b = bill || { name: '', amount: '', type: 'monthly', day: today().getDate(), date: ymd(today()), reminders: [...S.settings.defaultReminders] };
    const rem = [[0, 'Same day'], [1, '1 day before'], [3, '3 days before'], [7, '1 week before']];
    const due = bill ? dueIn(bill, viewMonth.getFullYear(), viewMonth.getMonth()) : null;
    const paidNow = bill && due && isPaid(bill, due);
    const body = `
      <label class="field">What is it?<input name="name" required value="${esc(b.name)}" placeholder="Rent, phone, car insurance…" autocomplete="off"></label>
      <label class="field">How much?<input name="amount" class="money" inputmode="decimal" value="${b.amount === '' ? '' : b.amount}" placeholder="${S.settings.currency}0.00"></label>
      <div class="field">How often?${segHTML('type', [['monthly', 'Every month'], ['once', 'Just once']], b.type)}</div>
      <label class="field" data-show="monthly" ${b.type === 'once' ? 'hidden' : ''}>Due on day of the month<input name="day" type="number" min="1" max="31" inputmode="numeric" value="${b.day || 1}"></label>
      <label class="field" data-show="once" ${b.type === 'once' ? '' : 'hidden'}>Due date<input name="date" type="date" value="${b.date || ymd(today())}"></label>
      <div class="field">Remind me<input type="hidden" name="reminders" value="${(b.reminders || []).join(',')}"><div class="toggles">${rem.map(([n, l]) => `<button type="button" data-rem="${n}" aria-pressed="${(b.reminders || []).includes(n)}">${l}</button>`).join('')}</div></div>
      ${bill && due ? `<button type="button" class="btn ${paidNow ? 'ghost' : ''}" data-act="toggle-paid" style="background:${paidNow ? '' : 'var(--teal)'}">${paidNow ? `Mark ${MONTHS[due.getMonth()]} as not paid` : `Mark ${MONTHS[due.getMonth()]} as paid`}</button>` : ''}
      <div class="speech">${M.billy(40)}<span id="billy-says"></span></div>`;
    openSheet(bill ? 'Edit bill' : 'New bill', body, () => {
      const name = val('name').trim(); const amount = num(val('amount'));
      if (!name) return toast('Give the bill a name');
      if (!amount) return toast('Add an amount');
      const data = { name, amount, type: val('type'), day: Math.min(31, Math.max(1, parseInt(val('day'), 10) || 1)), date: val('date'), reminders: val('reminders').split(',').filter(Boolean).map(Number) };
      if (bill) Object.assign(bill, data); else S.bills.push({ id: uid(), paid: {}, ...data });
      save(); closeSheet(); render(); toast(bill ? 'Bill updated' : 'Bill added');
      runReminders();
    }, { del: bill ? () => { S.bills = S.bills.filter((x) => x !== bill); } : null });
    $('#sheet')._bill = bill; $('#sheet')._due = due;
    billySays();
  }
  function billySays() {
    const el = $('#billy-says'); if (!el) return;
    const r = val('reminders').split(',').filter(Boolean).map(Number).sort((a, b) => b - a);
    const words = r.map((n) => (n === 0 ? 'on the day' : n === 1 ? '1 day before' : n === 7 ? '1 week before' : `${n} days before`));
    el.textContent = r.length ? `Got it! I will ping you ${words.join(' and ')}.` : 'No reminders? Billy will stay quiet for this one.';
  }

  function goalSheet(goal) {
    const colors = ['#7BD389', '#FFC93C', '#A9B4FF', '#FFB08C', '#F0A6E8'];
    const g = goal || { name: '', target: '', color: colors[S.goals.length % colors.length] };
    openSheet(goal ? 'Edit goal' : 'New goal', `
      <label class="field">Goal name<input name="name" value="${esc(g.name)}" placeholder="Emergency fund, trip, laptop…" autocomplete="off"></label>
      <label class="field">Target amount <span class="hint">Leave empty for no limit</span><input name="target" class="money" inputmode="decimal" value="${g.target || ''}" placeholder="${S.settings.currency}0"></label>
      <div class="field">Jar color<input type="hidden" name="color" value="${g.color}"><div class="toggles">${colors.map((c) => `<button type="button" data-color="${c}" aria-pressed="${c === g.color}" aria-label="Color ${c}" style="width:44px;padding:0;background:${c}"></button>`).join('')}</div></div>`,
    () => {
      const name = val('name').trim(); if (!name) return toast('Name your goal');
      const data = { name, target: num(val('target')), color: val('color') };
      if (goal) Object.assign(goal, data); else S.goals.push({ id: uid(), ...data });
      save(); closeSheet(); render();
    }, { del: goal ? () => { S.goals = S.goals.filter((x) => x !== goal); S.deposits = S.deposits.filter((d) => d.goalId !== goal.id); } : null });
  }

  function depositSheet(dep) {
    if (!S.goals.length) return goalSheet();
    const d = dep || { goalId: S.goals[0].id, amount: '', date: ymd(today()) };
    openSheet(dep ? 'Edit deposit' : 'Add money', `
      <label class="field">Which jar?<select name="goalId">${S.goals.map((g) => `<option value="${g.id}" ${g.id === d.goalId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
      <div class="field">Type${segHTML('dir', [['in', 'Put in'], ['out', 'Take out']], d.amount < 0 ? 'out' : 'in')}</div>
      <label class="field">Amount<input name="amount" class="money" inputmode="decimal" value="${d.amount === '' ? '' : Math.abs(d.amount)}" placeholder="${S.settings.currency}0.00"></label>
      <label class="field">Date<input name="date" type="date" value="${d.date}"></label>`,
    () => {
      const amt = num(val('amount')); if (!amt) return toast('Add an amount');
      const data = { goalId: val('goalId'), amount: val('dir') === 'out' ? -Math.abs(amt) : Math.abs(amt), date: val('date') || ymd(today()) };
      if (dep) Object.assign(dep, data); else S.deposits.push({ id: uid(), ...data });
      save(); closeSheet(); render(); toast(data.amount > 0 ? 'Oink! Saved.' : 'Taken out');
    }, { del: dep ? () => { S.deposits = S.deposits.filter((x) => x !== dep); } : null });
  }

  function spendSheet(sp) {
    const s = sp || { name: '', amount: '', cat: 'groceries', date: ymd(today()) };
    openSheet(sp ? 'Edit purchase' : 'Log a purchase', `
      <label class="field">How much?<input name="amount" class="money" inputmode="decimal" value="${s.amount}" placeholder="${S.settings.currency}0.00"></label>
      <label class="field">Where or what?<input name="name" value="${esc(s.name)}" placeholder="Supermarket, coffee…" autocomplete="off"></label>
      <div class="field">Category<input type="hidden" name="cat" value="${s.cat}"><div class="toggles">${CATS.map((c) => `<button type="button" data-cat="${c.id}" aria-pressed="${c.id === s.cat}">${c.name}</button>`).join('')}</div></div>
      <label class="field">Date<input name="date" type="date" value="${s.date}"></label>`,
    () => {
      const amount = num(val('amount')); if (!amount) return toast('Add an amount');
      const data = { amount, name: val('name').trim() || cat(val('cat')).name, cat: val('cat'), date: val('date') || ymd(today()) };
      if (sp) Object.assign(sp, data); else S.spends.push({ id: uid(), ...data });
      save(); closeSheet(); render();
    }, { del: sp ? () => { S.spends = S.spends.filter((x) => x !== sp); } : null });
  }

  function incomeSheet(inc) {
    const i = inc || { name: '', amount: '', date: ymd(today()) };
    openSheet(inc ? 'Edit income' : 'Extra income', `
      <label class="field">What was it?<input name="name" value="${esc(i.name)}" placeholder="Overtime, side job, refund…" autocomplete="off"></label>
      <label class="field">Amount<input name="amount" class="money" inputmode="decimal" value="${i.amount}" placeholder="${S.settings.currency}0.00"></label>
      <label class="field">Date<input name="date" type="date" value="${i.date}"></label>`,
    () => {
      const amount = num(val('amount')); if (!amount) return toast('Add an amount');
      const data = { name: val('name').trim() || 'Extra income', amount, date: val('date') || ymd(today()) };
      if (inc) Object.assign(inc, data); else S.income.push({ id: uid(), ...data });
      save(); closeSheet(); render();
    }, { del: inc ? () => { S.income = S.income.filter((x) => x !== inc); } : null });
  }

  function settingsSheet() {
    const st = S.settings;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    openSheet('Settings', `
      <label class="field">Pay per check<input name="payAmount" class="money" inputmode="decimal" value="${st.payAmount || ''}" placeholder="${st.currency}0"></label>
      <div class="field">How often are you paid?${segHTML('payFreq', [['weekly', 'Weekly'], ['biweekly', 'Every 2 wks'], ['monthly', 'Monthly']], st.payFreq)}</div>
      <label class="field">A recent payday <span class="hint">Any date you were paid. The app counts paydays forward from it.</span><input name="payAnchor" type="date" value="${st.payAnchor}"></label>
      <label class="field">Weekly debit budget<input name="weeklyBudget" inputmode="decimal" value="${st.weeklyBudget || ''}" placeholder="${st.currency}0"></label>
      <label class="field">Currency symbol<input name="currency" value="${esc(st.currency)}" maxlength="4"></label>
      <div>
        <div class="settings-row"><div>Due-date notifications<span>${perm === 'unsupported' ? 'Not supported here. Install the app to the home screen first.' : perm === 'denied' ? 'Blocked. Allow notifications for this app in your phone settings.' : st.notify && perm === 'granted' ? 'On. Billy pings you when a reminder day arrives.' : 'Off'}</span></div><button type="button" class="btn ${st.notify && perm === 'granted' ? 'ghost' : ''}" data-act="notify">${st.notify && perm === 'granted' ? 'Turn off' : 'Turn on'}</button></div>
        <div class="settings-row"><div>Add bills to my calendar<span>Most reliable reminders on any phone. Re-export after adding bills.</span></div><button type="button" class="btn ghost" data-act="ics">Export</button></div>
        <div class="settings-row"><div>Back up my data<span>Saves a file you can restore later.</span></div><button type="button" class="btn ghost" data-act="backup">Back up</button></div>
        <div class="settings-row"><div>Restore a backup<span>Replaces what is on this phone.</span></div><label class="btn ghost" style="display:grid;place-items:center">Restore<input type="file" accept="application/json" data-act="restore" class="sr"></label></div>
        <div class="settings-row"><div>Start fresh<span>Deletes everything in the app.</span></div><button type="button" class="btn danger" data-act="wipe">Erase</button></div>
      </div>`,
    () => {
      Object.assign(st, { payAmount: num(val('payAmount')), payFreq: val('payFreq'), payAnchor: val('payAnchor'), weeklyBudget: num(val('weeklyBudget')), currency: val('currency').trim() || '$' });
      save(); closeSheet(); render(); toast('Saved');
    });
  }

  function loadSample() {
    const t = today(); const y = t.getFullYear(), m = t.getMonth();
    const d = (day) => ymd(new Date(y, m, Math.min(day, daysIn(y, m))));
    const fri = (() => { const x = new Date(t); while (x.getDay() !== 5) x.setDate(x.getDate() - 1); return x; })();
    const g1 = uid(), g2 = uid(), g3 = uid();
    S = { ...structuredClone(DEFAULT_STATE),
      settings: { ...DEFAULT_STATE.settings, payAmount: 850, payFreq: 'weekly', payAnchor: ymd(fri), weeklyBudget: 250 },
      bills: [
        { id: uid(), name: 'Rent', amount: 1200, type: 'monthly', day: 1, reminders: [3, 7], paid: { [ym(t)]: true } },
        { id: uid(), name: 'Car insurance', amount: 142, type: 'monthly', day: 5, reminders: [1, 3], paid: { [ym(t)]: true } },
        { id: uid(), name: 'Phone', amount: 65, type: 'monthly', day: Math.min(t.getDate() + 2, 28), reminders: [1, 3], paid: {} },
        { id: uid(), name: 'Internet', amount: 70, type: 'monthly', day: 15, reminders: [1], paid: {} },
        { id: uid(), name: 'Dentist visit', amount: 120, type: 'once', date: d(18), reminders: [1, 3], paid: {} },
        { id: uid(), name: 'Gym', amount: 40, type: 'monthly', day: 20, reminders: [1], paid: {} },
        { id: uid(), name: 'Streaming', amount: 18, type: 'monthly', day: 28, reminders: [0], paid: {} }
      ],
      goals: [{ id: g1, name: 'Emergency fund', target: 5000, color: '#7BD389' }, { id: g2, name: 'Vacation', target: 2000, color: '#FFC93C' }, { id: g3, name: 'New laptop', target: 1200, color: '#A9B4FF' }],
      deposits: [{ id: uid(), goalId: g1, amount: 3050, date: ymd(addDays(t, -40)) }, { id: uid(), goalId: g1, amount: 75, date: ymd(addDays(fri, -7)) }, { id: uid(), goalId: g1, amount: 75, date: ymd(fri) }, { id: uid(), goalId: g2, amount: 850, date: ymd(addDays(t, -5)) }, { id: uid(), goalId: g3, amount: 400, date: ymd(addDays(t, -20)) }],
      spends: [{ id: uid(), name: 'Supermarket', amount: 38, cat: 'groceries', date: ymd(t) }, { id: uid(), name: 'Coffee + bagel', amount: 15, cat: 'food', date: ymd(t) }, { id: uid(), name: 'Gas station', amount: 38, cat: 'gas', date: ymd(addDays(t, -1)) }, { id: uid(), name: 'Lunch', amount: 26, cat: 'food', date: ymd(addDays(t, -2)) }],
      income: [], sent: {} };
    save(); render(); toast('Sample data loaded. Erase it any time in Settings.');
  }

  // ---------- events ----------
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-tab],[data-act],[data-close],[data-seg],[data-rem],[data-color],[data-cat]');
    if (!el) return;
    if (el.dataset.tab) { tab = el.dataset.tab; try { localStorage.setItem('mb.tab', tab); } catch (x) { /* ignore */ } render(); window.scrollTo(0, 0); return; }
    if ('close' in el.dataset) return closeSheet();
    if (el.dataset.seg) {
      const name = el.dataset.seg; $('#sheet').elements[name].value = el.dataset.v;
      el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el));
      if (name === 'type') $('#sheet').querySelectorAll('[data-show]').forEach((f) => { f.hidden = f.dataset.show !== el.dataset.v; });
      return;
    }
    if (el.dataset.rem !== undefined) {
      el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true');
      $('#sheet').elements.reminders.value = [...el.parentElement.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.rem).join(',');
      return billySays();
    }
    if (el.dataset.color) { $('#sheet').elements.color.value = el.dataset.color; el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el)); return; }
    if (el.dataset.cat) { $('#sheet').elements.cat.value = el.dataset.cat; el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el)); return; }

    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'prev-month': viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); return render();
      case 'next-month': viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); return render();
      case 'filter': billFilter = el.dataset.f; return render();
      case 'add': return ({ bills: () => billSheet(), savings: () => depositSheet(), debit: () => spendSheet(), summary: () => incomeSheet() })[tab]();
      case 'add-goal': return goalSheet();
      case 'add-income': return incomeSheet();
      case 'edit-bill': return billSheet(S.bills.find((b) => b.id === id));
      case 'edit-goal': return goalSheet(S.goals.find((g) => g.id === id));
      case 'edit-deposit': return depositSheet(S.deposits.find((d) => d.id === id));
      case 'edit-spend': return spendSheet(S.spends.find((s) => s.id === id));
      case 'edit-income': return incomeSheet(S.income.find((i) => i.id === id));
      case 'settings': return settingsSheet();
      case 'sample': return loadSample();
      case 'toggle-paid': {
        const f = $('#sheet'); const b = f._bill; const k = ym(f._due);
        b.paid ||= {}; if (b.paid[k]) delete b.paid[k]; else b.paid[k] = true;
        save(); closeSheet(); render(); toast(b.paid[k] ? `${b.name} marked paid. Billy is proud!` : 'Marked as not paid');
        return;
      }
      case 'sheet-delete': {
        if (!confirm('Delete this for good?')) return;
        $('#sheet')._del(); save(); closeSheet(); render(); toast('Deleted');
        return;
      }
      case 'notify': {
        if (!('Notification' in window)) return toast('Install the app to your home screen to get notifications');
        if (S.settings.notify && Notification.permission === 'granted') { S.settings.notify = false; save(); return settingsSheet(); }
        const p = await Notification.requestPermission();
        S.settings.notify = p === 'granted'; save();
        if (p === 'granted') {
          try { const reg = await navigator.serviceWorker.ready; if ('periodicSync' in reg) await reg.periodicSync.register('mb-reminders', { minInterval: 12 * 3600 * 1000 }); } catch (x) { /* best effort */ }
          runReminders(); toast('Notifications on');
        } else toast('Notifications were not allowed');
        return settingsSheet();
      }
      case 'ics': if (!S.bills.length) return toast('Add a bill first'); return download('money-buddies-bills.ics', icsFor(S.bills), 'text/calendar');
      case 'backup': return download(`money-buddies-backup-${ymd(today())}.json`, JSON.stringify(S, null, 2), 'application/json');
      case 'wipe': if (confirm('Erase all bills, savings and purchases?')) { S = structuredClone(DEFAULT_STATE); save(); closeSheet(); render(); toast('All clear'); } return;
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.dataset.act !== 'restore' || !e.target.files[0]) return;
    e.target.files[0].text().then((txt) => {
      try { const s = JSON.parse(txt); if (!s.bills) throw new Error(); S = { ...structuredClone(DEFAULT_STATE), ...s }; save(); closeSheet(); render(); toast('Backup restored'); }
      catch (x) { toast('That file is not a Money Buddies backup'); }
    });
  });
  $('#sheet').addEventListener('submit', (e) => { e.preventDefault(); sheetSubmit && sheetSubmit(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet-wrap').hidden) closeSheet(); });
  $('#fab').addEventListener('click', () => ({ bills: () => billSheet(), savings: () => depositSheet(), debit: () => spendSheet(), summary: () => incomeSheet() })[tab]());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); runReminders(); } });

  // ---------- boot ----------
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  mirrorToIDB();
  runReminders();
})();
