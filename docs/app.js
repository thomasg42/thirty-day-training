/**
 * 30-Day Check Sheet — rebuilt off Base44 as a static PWA on GitHub Pages with
 * a Cloudflare Worker + D1 ledger behind it.
 *
 * Two audiences share one deployment:
 *   staff  — pick their name, tick milestones, initial, watch linked training
 *   admin  — everything above plus manager sign-offs, media links, roster,
 *            branding and credential rotation
 */

import { PHASES, ALL_TASKS, TOTAL_TASKS, TASK_BY_ID, SIGNATURE_BLOCKS, WELCOME_MEDIA_KEY, collectMediaKeys, countCompletedDays, getLastActivity, DAY_TASKS } from './data/curriculum.js';
import { BRANDS, DEFAULT_BRAND, applyBrand } from './brand.js';
import * as cloud from './cloud.js';

const MEDIA_KEYS = collectMediaKeys();

const state = {
  route: 'sheet',
  employees: [],
  settings: {},
  activeId: '',
  openPhases: new Set(['pre-start']),
  stale: false,
};

/* -------------------------------- utilities ------------------------------- */

const $ = (selector, root = document) => root.querySelector(selector);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

let toastTimer;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}

function overlay(html, wire) {
  const root = $('#overlay-root');
  root.innerHTML = `<div class="overlay"><div class="sheet">${html}</div></div>`;
  const close = () => {
    root.innerHTML = '';
  };
  root.querySelector('.overlay').addEventListener('click', (event) => {
    if (event.target === root.querySelector('.overlay')) close();
  });
  if (wire) wire(root.querySelector('.sheet'), close);
  return close;
}

function uid() {
  return `emp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function initialsOf(employee) {
  return `${(employee.firstName || '?')[0] || ''}${(employee.lastName || '')[0] || ''}`.toUpperCase();
}

function fullName(employee) {
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unnamed';
}

function youTubeEmbed(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let id = null;
    if (parsed.hostname.includes('youtu.be')) id = parsed.pathname.slice(1);
    else if (parsed.hostname.includes('youtube.com')) id = parsed.searchParams.get('v') || (parsed.pathname.startsWith('/shorts/') ? parsed.pathname.split('/')[2] : null);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

function safeUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/* --------------------------------- getters -------------------------------- */

const mediaMap = () => state.settings.media || {};
const labelMap = () => state.settings.labels || {};

function activeEmployee() {
  return state.employees.find((employee) => employee.id === state.activeId) || null;
}

/** Admin-editable label override, falling back to the extracted curriculum. */
function labelFor(task) {
  const override = labelMap()[task.id] || {};
  return {
    milestone: override.milestone || task.milestone || task.label || '',
    description: override.description ?? task.description ?? '',
  };
}

function phaseTaskIds(phase) {
  if (phase.tasks) return phase.tasks.map((task) => task.id);
  if (phase.policyItems) return phase.policyItems.map((item) => item.id);
  return [];
}

function phaseProgress(phase, employee) {
  const ids = phaseTaskIds(phase);
  const done = ids.filter((id) => employee?.checked?.[id]).length;
  return { done, total: ids.length, pct: ids.length ? Math.round((done / ids.length) * 100) : 0 };
}

/* ------------------------------- persistence ------------------------------ */

const saveTimers = new Map();

/** Debounced per-employee push so a burst of taps is one request. */
function queueSave(employee) {
  const record = { ...employee };
  record.completedDayCount = countCompletedDays(record.checked || {});
  record.lastActivity = getLastActivity(record.checked || {}) || record.lastActivity || '';
  const index = state.employees.findIndex((item) => item.id === record.id);
  if (index >= 0) state.employees[index] = record;

  clearTimeout(saveTimers.get(record.id));
  saveTimers.set(
    record.id,
    setTimeout(async () => {
      const saved = await cloud.saveEmployee(record);
      const position = state.employees.findIndex((item) => item.id === saved.id);
      if (position >= 0) state.employees[position] = saved;
      renderStatus();
    }, 550),
  );
  renderStatus();
}

/* ---------------------------------- boot --------------------------------- */

async function boot() {
  applyBrand(DEFAULT_BRAND);
  startClock();

  let status;
  try {
    status = await cloud.fetchStatus();
  } catch {
    // Offline on a cold start: run from cache if this device was unlocked before.
    if (cloud.storedToken()) return startApp({ offline: true });
    return renderLock({ offline: true });
  }

  if (!status.claimed) return renderSetup();
  if (!cloud.storedToken()) return renderLock({});
  return startApp({});
}

async function startApp({ offline }) {
  $('#lock').classList.add('hidden');
  $('#app').classList.remove('hidden');

  await refresh({ silent: true });

  state.activeId = cloud.activeEmployeeId();
  if (!state.activeId && state.employees.length === 1) state.activeId = state.employees[0].id;
  if (state.activeId) {
    const employee = activeEmployee();
    if (employee) {
      employee.appOpenCount = (Number(employee.appOpenCount) || 0) + 1;
      queueSave(employee);
    }
  }

  state.route = state.activeId ? 'sheet' : 'team';
  wireChrome();
  cloud.onConnectionChange(renderStatus);
  cloud.flushOutbox().then(renderStatus).catch(() => {});
  render();
  if (offline) toast('Offline — showing last synced data');
}

async function refresh({ silent } = {}) {
  const [employeesResult, settingsResult] = await Promise.all([cloud.listEmployees(), cloud.loadSettings()]);
  state.employees = employeesResult.employees || [];
  state.settings = settingsResult.settings || {};
  state.stale = Boolean(employeesResult.stale || settingsResult.stale);
  applyBrand(state.settings.brand || DEFAULT_BRAND);
  if (!silent) toast(state.stale ? 'Offline — cached data' : 'Up to date');
}

/* -------------------------------- lock views ------------------------------ */

function renderSetup() {
  $('#lock-body').innerHTML = `
    <div class="card card-pad" style="text-align:left">
      <h2>First-time setup</h2>
      <p class="muted">Nobody has claimed this check sheet yet. Set the two codes now — they are stored hashed on the server and never saved in the repo.</p>
      <form id="setup-form">
        <label class="field">
          <span>Staff access code — everyone on the team gets this</span>
          <input name="accessCode" type="text" autocomplete="off" placeholder="e.g. noodles30" required minlength="4" />
        </label>
        <label class="field">
          <span>Admin PIN — managers only, unlocks sign-offs and settings</span>
          <input name="adminPin" type="text" autocomplete="off" placeholder="at least 6 characters" required minlength="6" />
        </label>
        <button class="btn block" type="submit">Claim this check sheet</button>
        <p class="err hidden" id="setup-err"></p>
      </form>
      <p class="tiny" style="margin-top:14px">Write both down somewhere safe. The admin PIN can rotate either code later, but a forgotten admin PIN can only be reset from the Cloudflare dashboard.</p>
    </div>`;

  $('#setup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    const error = $('#setup-err');
    button.disabled = true;
    error.classList.add('hidden');
    try {
      const data = new FormData(form);
      await cloud.claim(String(data.get('accessCode')), String(data.get('adminPin')));
      await cloud.unlock(String(data.get('adminPin')));
      await startApp({});
      toast('Set up — you are signed in as admin');
    } catch (caught) {
      error.textContent = caught.message;
      error.classList.remove('hidden');
      button.disabled = false;
    }
  });
}

function renderLock({ offline }) {
  $('#lock-body').innerHTML = `
    <div class="card card-pad" style="text-align:left">
      <h2>Enter your code</h2>
      <p class="muted">Staff access code opens the check sheet. The admin PIN also unlocks manager sign-offs and settings.</p>
      ${offline ? '<div class="warn-box" style="margin-bottom:14px"><b>No connection</b><span class="tiny">You need to be online the first time you unlock on this device.</span></div>' : ''}
      <form id="lock-form">
        <label class="field">
          <span>Code</span>
          <input name="code" type="password" autocomplete="current-password" placeholder="access code or admin PIN" required />
        </label>
        <button class="btn block" type="submit">Unlock</button>
        <p class="err hidden" id="lock-err"></p>
      </form>
    </div>`;

  $('#lock-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    const error = $('#lock-err');
    button.disabled = true;
    error.classList.add('hidden');
    try {
      const scope = await cloud.unlock(String(new FormData(form).get('code')));
      await startApp({});
      toast(scope === 'admin' ? 'Unlocked as admin' : 'Unlocked');
    } catch (caught) {
      error.textContent = caught.status === 401 ? 'That code did not work.' : caught.message;
      error.classList.remove('hidden');
      button.disabled = false;
    }
  });
}

/* --------------------------------- chrome -------------------------------- */

function startClock() {
  const tick = () => {
    const now = new Date();
    const date = $('#bar-date');
    const clock = $('#bar-clock');
    if (date) date.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    if (clock) clock.textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

function wireChrome() {
  $('#nav').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-route]');
    if (!button) return;
    state.route = button.dataset.route;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#btn-refresh').addEventListener('click', async () => {
    await cloud.flushOutbox().catch(() => {});
    await refresh({});
    render();
  });
}

function renderStatus() {
  const strip = $('#status-strip');
  if (!strip) return;
  const pending = cloud.pendingWrites();
  if (!cloud.isOnline()) {
    strip.className = 'status-strip offline';
    strip.textContent = pending ? `Offline — ${pending} change${pending === 1 ? '' : 's'} waiting to sync` : 'Offline — showing last synced data';
  } else if (pending) {
    strip.className = 'status-strip pending';
    strip.textContent = `Syncing ${pending} change${pending === 1 ? '' : 's'}…`;
  } else {
    strip.className = 'status-strip hidden';
    strip.textContent = '';
  }

  const who = $('#bar-who');
  const employee = activeEmployee();
  if (who) {
    who.textContent = cloud.isAdmin()
      ? employee ? `ADMIN · ${employee.employeeId || initialsOf(employee)}` : 'ADMIN'
      : employee ? `#${employee.employeeId || initialsOf(employee)}` : '';
  }
}

function render() {
  $('#nav').querySelectorAll('button[data-route]').forEach((button) => {
    if (button.dataset.route === state.route) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  const view = $('#view');
  if (state.route === 'team') view.innerHTML = teamView();
  else if (state.route === 'admin') view.innerHTML = adminView();
  else view.innerHTML = sheetView();

  renderStatus();
  wireView();
}

/* ------------------------------- sheet view ------------------------------ */

function sheetView() {
  const employee = activeEmployee();
  if (!employee) {
    return `<div class="stack">
      <div class="card card-pad">
        <h2>No trainee selected</h2>
        <p class="muted">Pick who this check sheet is for, or add a new hire.</p>
        <button class="btn block" data-act="goto-team">Choose from the team</button>
      </div>
    </div>`;
  }

  const done = countCompletedDays(employee.checked || {});
  const pct = TOTAL_TASKS ? Math.round((done / TOTAL_TASKS) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - pct / 100);
  const dayCount = DAY_TASKS.filter((task) => employee.checked?.[task.id]).length;
  const last = getLastActivity(employee.checked || {});

  return `<div class="stack">
    <section class="card">
      <div class="hero">
        <div class="ring">
          <svg viewBox="0 0 92 92" aria-hidden="true">
            <circle class="track" cx="46" cy="46" r="40"></circle>
            <circle class="value" cx="46" cy="46" r="40"
              stroke-dasharray="${circumference.toFixed(1)}"
              stroke-dashoffset="${offset.toFixed(1)}"></circle>
          </svg>
          <div class="label"><b>${pct}%</b><span>${done}/${TOTAL_TASKS}</span></div>
        </div>
        <div class="hero-copy">
          <p class="name">${esc(fullName(employee))}</p>
          <p class="sub">#${esc(employee.employeeId || '—')} · started ${esc(employee.startDate || '—')}</p>
          <p class="sub">Day ${dayCount} of 30 milestones checked</p>
          ${last ? `<p class="last">Last: ${esc(last)}</p>` : ''}
        </div>
      </div>
      <div class="chips">
        ${PHASES.filter((phase) => !phase.mediaOnly).map((phase) => {
          const progress = phaseProgress(phase, employee);
          return `<span class="chip ${progress.done === progress.total && progress.total ? 'done' : ''}">${esc(phase.title.replace(/ —.*$/, ''))} ${progress.done}/${progress.total}</span>`;
        }).join('')}
      </div>
    </section>

    ${welcomeCard(employee)}

    ${PHASES.map((phase) => phaseCard(phase, employee)).join('')}

    ${signatureCard(employee)}

    <p class="tiny" style="padding:0 4px 8px">Every tick saves to the server automatically. ${cloud.isAdmin() ? 'You are in admin mode — manager sign-off boxes are unlocked.' : 'Manager sign-off boxes need the admin PIN.'}</p>
  </div>`;
}

/**
 * Repaints the hero ring, counters and phase chips in place after a tick, so
 * the headline percentage matches the checkbox that was just tapped instead of
 * waiting for the next full render.
 */
function updateHero(employee) {
  const view = $('#view');
  const ring = view.querySelector('.ring .value');
  if (!ring) return;

  const done = countCompletedDays(employee.checked || {});
  const pct = TOTAL_TASKS ? Math.round((done / TOTAL_TASKS) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  ring.setAttribute('stroke-dashoffset', (circumference * (1 - pct / 100)).toFixed(1));

  const label = view.querySelector('.ring .label');
  if (label) {
    label.querySelector('b').textContent = `${pct}%`;
    label.querySelector('span').textContent = `${done}/${TOTAL_TASKS}`;
  }

  const dayCount = DAY_TASKS.filter((task) => employee.checked?.[task.id]).length;
  const subs = view.querySelectorAll('.hero-copy .sub');
  if (subs[1]) subs[1].textContent = `Day ${dayCount} of 30 milestones checked`;

  const last = getLastActivity(employee.checked || {});
  const lastNode = view.querySelector('.hero-copy .last');
  if (last && lastNode) lastNode.textContent = `Last: ${last}`;

  const chips = view.querySelectorAll('.chips .chip');
  PHASES.filter((phase) => !phase.mediaOnly).forEach((phase, index) => {
    const chip = chips[index];
    if (!chip) return;
    const progress = phaseProgress(phase, employee);
    chip.textContent = `${phase.title.replace(/ —.*$/, '')} ${progress.done}/${progress.total}`;
    chip.classList.toggle('done', progress.done === progress.total && progress.total > 0);
  });
}

/**
 * The welcome block. Mirrors Base44's Welcome Message Editor: an optional
 * message plus a titled video with a caption, all admin-editable.
 */
function welcomeCard(employee) {
  const welcome = state.settings.welcome || {};
  if (welcome.enabled === false) return '';
  const url = safeUrl(mediaMap()[WELCOME_MEDIA_KEY]);
  const message = welcome.message || '';
  if (!url && !message) return '';

  const embed = youTubeEmbed(url);
  const title = welcome.videoTitle || 'Watch the welcome video';
  return `<section class="card card-pad">
    <h2>Welcome${employee.firstName ? `, ${esc(employee.firstName)}` : ''}</h2>
    ${message ? `<p class="muted" style="margin-top:6px">${esc(message)}</p>` : ''}
    ${url ? `<div class="links" style="margin-top:12px">
      ${embed
        ? `<button class="link-btn" data-act="play-welcome" data-embed="${esc(embed)}">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> ${esc(title)}
           </button>`
        : `<a class="link-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`}
    </div>
    <div class="embed hidden" data-embed-for="welcome"></div>` : ''}
    ${welcome.videoDescription ? `<p class="tiny" style="margin-top:10px">${esc(welcome.videoDescription)}</p>` : ''}
  </section>`;
}

function phaseCard(phase, employee) {
  const open = state.openPhases.has(phase.key);

  // Reference-media sections carry no milestones, so they get no counter or bar.
  if (phase.mediaOnly) {
    const links = phase.media.map((item) => mediaLink(item.key, item.label, item.type, employee)).join('');
    return `<section class="card phase ${open ? 'open' : ''}" data-tone="${phase.tone}" data-phase="${esc(phase.key)}">
      <button class="phase-head" data-act="toggle-phase" data-phase="${esc(phase.key)}">
        <span class="t"><b>${esc(phase.title)}</b><span>${esc(phase.subtitle)}</span></span>
        <span class="phase-count">${phase.media.length} links</span>
        <svg class="caret" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div class="phase-body">
        <div class="task"><div class="task-body">
          <div class="links">${links}</div>
          <div class="embed hidden" data-embed-for="${esc(phase.key)}"></div>
        </div></div>
      </div>
    </section>`;
  }

  const progress = phaseProgress(phase, employee);
  const rows = phase.policyItems
    ? phase.policyItems.map((item) => taskRow(item, employee, { policy: true })).join('')
    : phase.tasks.map((task) => taskRow(task, employee, {})).join('');

  return `<section class="card phase ${open ? 'open' : ''}" data-tone="${phase.tone}" data-phase="${esc(phase.key)}">
    <button class="phase-head" data-act="toggle-phase" data-phase="${esc(phase.key)}">
      <span class="t"><b>${esc(phase.title)}</b><span>${esc(phase.subtitle)}</span></span>
      <span class="phase-count ${progress.done === progress.total && progress.total ? 'full' : ''}">${progress.done}/${progress.total}</span>
      <svg class="caret" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <div class="phase-bar"><i style="width:${progress.pct}%"></i></div>
    <div class="phase-body">${rows}</div>
  </section>`;
}

function taskRow(task, employee, { policy }) {
  const checked = Boolean(employee.checked?.[task.id]);
  const { milestone, description } = labelFor(task);
  const badges = (task.badges || []).map((badge) => `<span class="badge ${esc(badge)}">${badge === 'day30' ? 'Day 30' : esc(badge)}</span>`).join('');
  const signoffBadge = task.hasManagerSignOff ? '<span class="badge signoff">Manager sign-off</span>' : '';
  const highlight = task.highlight === 'gold' ? 'gold' : task.highlight === 'red' ? 'red' : '';

  const buttons = [];
  (task.buttons || []).forEach((button, index) => {
    buttons.push(mediaLink(button.key || `${task.id}-b${index}`, button.label, button.type, employee));
  });
  if (task.policyUrlKey) buttons.push(mediaLink(task.policyUrlKey, 'Reference doc', 'doc', employee));
  if (policy && task.videoKey) buttons.push(mediaLink(task.videoKey, milestone, 'video', employee));

  const initials = esc(employee.initials?.[task.id] || '');
  const signoff = esc(employee.managerSignoffs?.[task.id] || '');
  const signKey = task.signKey ? `<div class="initial-box"><span>Signature</span><input data-act="sign" data-key="${esc(task.signKey)}" value="${esc(employee.policySignatures?.[task.signKey] || '')}" maxlength="24" placeholder="sign" /></div>` : '';

  return `<div class="task ${checked ? 'checked' : ''} ${highlight}">
    <button class="check" role="checkbox" aria-checked="${checked}" data-act="check" data-id="${esc(task.id)}" aria-label="Mark ${esc(milestone)}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
    </button>
    <div class="task-body">
      <div class="task-title">
        ${task.day != null ? `<span class="day-pill">DAY ${task.day}</span>` : ''}
        <span class="ms">${esc(milestone)}</span>
        ${badges}${signoffBadge}
      </div>
      ${description ? `<p class="task-desc">${esc(description)}</p>` : ''}
      ${buttons.length ? `<div class="links">${buttons.join('')}</div>` : ''}
      <div class="embed hidden" data-embed-for="${esc(task.id)}"></div>
      <div class="task-meta">
        <div class="initial-box"><span>Initials</span><input data-act="initials" data-id="${esc(task.id)}" value="${initials}" maxlength="4" placeholder="—" /></div>
        ${task.hasManagerSignOff ? `<div class="initial-box signoff"><span>Manager</span><input data-act="signoff" data-id="${esc(task.id)}" value="${signoff}" maxlength="6" placeholder="${cloud.isAdmin() ? '—' : 'locked'}" ${cloud.isAdmin() ? '' : 'disabled'} /></div>` : ''}
        ${signKey}
      </div>
    </div>
  </div>`;
}

function mediaLink(key, label, type, employee) {
  const url = safeUrl(mediaMap()[key]);
  const watched = Boolean(employee.watchedVideos?.[key]);
  const icon = type === 'video'
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
    : type === 'image'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';

  if (!url) {
    return `<button class="link-btn missing" data-act="${cloud.isAdmin() ? 'add-media' : 'noop'}" data-key="${esc(key)}" data-label="${esc(label)}">${icon} ${esc(label)} · ${cloud.isAdmin() ? 'add link' : 'link pending'}</button>`;
  }

  const embed = youTubeEmbed(url);
  if (embed) {
    return `<button class="link-btn ${watched ? 'watched' : ''}" data-act="play" data-key="${esc(key)}" data-embed="${esc(embed)}">${icon} ${esc(label)}</button>`;
  }
  return `<a class="link-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-act="mark-opened" data-key="${esc(key)}">${icon} ${esc(label)}</a>`;
}

function signatureCard(employee) {
  return `<section class="card card-pad">
    <h2>Completion sign-off</h2>
    <p class="muted" style="margin-bottom:12px">Signed once all 30 days and both policy packs are complete.</p>
    ${SIGNATURE_BLOCKS.map((block) => `
      <label class="field">
        <span>${esc(block.label)}</span>
        <input data-act="signature" data-key="${esc(block.key)}" value="${esc(employee.signatures?.[block.key] || '')}" placeholder="type full name" ${block.key === 'employee' || cloud.isAdmin() ? '' : 'disabled'} />
      </label>`).join('')}
    <button class="btn ghost block" data-act="print">Print / save as PDF</button>
  </section>`;
}

/* -------------------------------- team view ------------------------------ */

function teamView() {
  const sorted = [...state.employees].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  return `<div class="stack">
    <section class="card card-pad">
      <h2>Team</h2>
      <p class="muted">Tap a name to open their check sheet.</p>
      <button class="btn block accent" style="margin-top:12px" data-act="add-employee">+ Add new hire</button>
    </section>

    <section class="card">
      ${sorted.length ? sorted.map((employee) => {
        const done = countCompletedDays(employee.checked || {});
        const pct = TOTAL_TASKS ? Math.round((done / TOTAL_TASKS) * 100) : 0;
        return `<button class="list-row" data-act="pick-employee" data-id="${esc(employee.id)}">
          <span class="avatar">${esc(initialsOf(employee))}</span>
          <span class="info">
            <b>${esc(fullName(employee))}</b>
            <span>#${esc(employee.employeeId || '—')} · ${pct}% · ${esc(employee.lastActivity || 'not started')}</span>
          </span>
          <span class="mini-bar"><i style="width:${pct}%"></i></span>
        </button>`;
      }).join('') : '<div class="card-pad"><p class="muted">Nobody added yet.</p></div>'}
    </section>
  </div>`;
}

/* ------------------------------- admin view ----------------------------- */

function adminView() {
  if (!cloud.isAdmin()) {
    return `<div class="stack">
      <section class="card card-pad">
        <h2>Admin locked</h2>
        <p class="muted">Enter the admin PIN to manage the roster, training links, branding and codes.</p>
        <button class="btn block" style="margin-top:12px" data-act="elevate">Enter admin PIN</button>
      </section>
    </div>`;
  }

  const media = mediaMap();
  const filled = MEDIA_KEYS.filter((entry) => safeUrl(media[entry.key])).length;

  return `<div class="stack">
    <section class="card card-pad">
      <h2>Branding</h2>
      <p class="muted" style="margin-bottom:12px">Relabels the whole app for everyone. Curriculum wording is edited per task below.</p>
      <label class="field">
        <span>Brand</span>
        <select data-act="set-brand">
          ${Object.values(BRANDS).map((brand) => `<option value="${esc(brand.id)}" ${(state.settings.brand || DEFAULT_BRAND) === brand.id ? 'selected' : ''}>${esc(brand.plainName)}</option>`).join('')}
        </select>
      </label>
    </section>

    <section class="card card-pad">
      <h2>Welcome block</h2>
      <p class="muted" style="margin-bottom:12px">Shown at the very top of every trainee's check sheet. The video URL itself lives in Training links below as <code>welcome-video</code>.</p>
      <label class="field">
        <span>Show the welcome block</span>
        <select data-act="welcome-enabled">
          <option value="on" ${(state.settings.welcome || {}).enabled === false ? '' : 'selected'}>Shown</option>
          <option value="off" ${(state.settings.welcome || {}).enabled === false ? 'selected' : ''}>Hidden</option>
        </select>
      </label>
      <label class="field">
        <span>Welcome message</span>
        <textarea data-act="welcome-field" data-field="message" rows="3" placeholder="Welcome to the team!">${esc((state.settings.welcome || {}).message || '')}</textarea>
      </label>
      <label class="field">
        <span>Video button title</span>
        <input type="text" data-act="welcome-field" data-field="videoTitle" value="${esc((state.settings.welcome || {}).videoTitle || '')}" placeholder="Watch: Welcome from TG" />
      </label>
      <label class="field">
        <span>Caption under the button</span>
        <input type="text" data-act="welcome-field" data-field="videoDescription" value="${esc((state.settings.welcome || {}).videoDescription || '')}" placeholder="Most people don't make it this far — and you did…" />
      </label>
    </section>

    <section class="card card-pad">
      <h2>Training links</h2>
      <p class="muted">${filled} of ${MEDIA_KEYS.length} links set. Paste a YouTube URL to embed it inline, or any https link to open in a new tab.</p>
      ${filled === 0 ? `<div class="warn-box" style="margin:12px 0">
        <b>No links carried over from Base44</b>
        <span class="tiny">The old app kept video and policy URLs in its own database, not in the code that was exported — so none came across. Pull them out of the live Base44 app before you cancel it, then paste them here or bulk-import below.</span>
      </div>` : ''}
      <div class="row" style="margin:12px 0">
        <button class="btn ghost sm" data-act="import-media">Bulk import JSON</button>
        <button class="btn ghost sm" data-act="export-media">Export JSON</button>
      </div>
      <details>
        <summary class="tiny" style="cursor:pointer;padding:6px 0">Show all ${MEDIA_KEYS.length} link slots</summary>
        ${MEDIA_KEYS.map((entry) => `
          <div class="media-row">
            <label>${esc(entry.label)} <span class="tiny">— ${esc(entry.milestone)}</span></label>
            <p class="tiny">key <code>${esc(entry.key)}</code> · ${esc(entry.type)}</p>
            <input type="url" data-act="set-media" data-key="${esc(entry.key)}" value="${esc(media[entry.key] || '')}" placeholder="https://…" />
          </div>`).join('')}
      </details>
    </section>

    <section class="card card-pad">
      <h2>Curriculum wording</h2>
      <p class="muted" style="margin-bottom:12px">Overrides a task's title and description for every trainee — use this to move the sheet onto another brand's stations without touching code. Blank resets to the original.</p>
      <button class="btn ghost block sm" data-act="edit-labels">Edit task wording (${ALL_TASKS.length} tasks)</button>
    </section>

    <section class="card card-pad">
      <h2>Roster</h2>
      ${state.employees.length ? state.employees.map((employee) => `
        <div class="kv">
          <div>
            <b>${esc(fullName(employee))}</b>
            <p class="tiny">#${esc(employee.employeeId || '—')} · ${countCompletedDays(employee.checked || {})}/${TOTAL_TASKS} · opened ${Number(employee.appOpenCount) || 0}×</p>
          </div>
          <button class="btn danger sm" data-act="delete-employee" data-id="${esc(employee.id)}">Delete</button>
        </div>`).join('') : '<p class="muted">Nobody added yet.</p>'}
    </section>

    <section class="card card-pad">
      <h2>Codes</h2>
      <p class="muted" style="margin-bottom:12px">Rotate either code. Staff will need the new access code on their next unlock.</p>
      <button class="btn ghost block sm" data-act="rotate">Rotate access code / admin PIN</button>
      <button class="btn ghost block sm" style="margin-top:8px" data-act="drop-admin">Leave admin mode on this device</button>
    </section>

    <section class="card card-pad">
      <h2>Data</h2>
      <p class="muted" style="margin-bottom:12px">Full server-side export of every trainee record and setting.</p>
      <button class="btn ghost block sm" data-act="export-all">Download JSON backup</button>
      <button class="btn danger block sm" style="margin-top:8px" data-act="sign-out">Sign out of this device</button>
    </section>
  </div>`;
}

/* --------------------------------- wiring ------------------------------- */

let viewWired = false;

/**
 * Attach the delegated handlers exactly once. render() only swaps innerHTML, so
 * delegation on #view survives — re-binding per render would stack duplicate
 * listeners and a single tap would toggle a checkbox twice, back to where it
 * started.
 */
function wireView() {
  if (viewWired) return;
  viewWired = true;
  const view = $('#view');

  view.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    const employee = activeEmployee();

    switch (act) {
      case 'goto-team':
        state.route = 'team';
        render();
        break;

      case 'toggle-phase': {
        const key = target.dataset.phase;
        if (state.openPhases.has(key)) state.openPhases.delete(key);
        else state.openPhases.add(key);
        target.closest('.phase').classList.toggle('open');
        break;
      }

      case 'check': {
        if (!employee) return;
        const id = target.dataset.id;
        const next = !employee.checked?.[id];
        employee.checked = { ...(employee.checked || {}), [id]: next };
        target.setAttribute('aria-checked', String(next));
        target.closest('.task').classList.toggle('checked', next);
        const phase = target.closest('.phase');
        if (phase) {
          const definition = PHASES.find((item) => item.key === phase.dataset.phase);
          if (definition) {
            const progress = phaseProgress(definition, employee);
            const count = phase.querySelector('.phase-count');
            count.textContent = `${progress.done}/${progress.total}`;
            count.classList.toggle('full', progress.done === progress.total && progress.total > 0);
            phase.querySelector('.phase-bar i').style.width = `${progress.pct}%`;
          }
        }
        updateHero(employee);
        queueSave(employee);
        break;
      }

      case 'play': {
        const container = target.closest('.task-body').querySelector('[data-embed-for]');
        const url = target.dataset.embed;
        if (container.dataset.loaded === url) {
          container.classList.toggle('hidden');
        } else {
          container.innerHTML = `<iframe src="${esc(url)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Training video"></iframe>`;
          container.dataset.loaded = url;
          container.classList.remove('hidden');
        }
        if (employee) {
          employee.watchedVideos = { ...(employee.watchedVideos || {}), [target.dataset.key]: true };
          target.classList.add('watched');
          queueSave(employee);
        }
        break;
      }

      case 'play-welcome': {
        const container = target.closest('.card').querySelector('[data-embed-for="welcome"]');
        const url = target.dataset.embed;
        if (container.dataset.loaded === url) {
          container.classList.toggle('hidden');
        } else {
          container.innerHTML = `<iframe src="${esc(url)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Welcome video"></iframe>`;
          container.dataset.loaded = url;
          container.classList.remove('hidden');
        }
        break;
      }

      case 'mark-opened':
        if (employee) {
          employee.watchedVideos = { ...(employee.watchedVideos || {}), [target.dataset.key]: true };
          queueSave(employee);
        }
        break;

      case 'add-media':
        promptMedia(target.dataset.key, target.dataset.label);
        break;

      case 'print':
        window.print();
        break;

      case 'add-employee':
        promptEmployee();
        break;

      case 'pick-employee':
        state.activeId = target.dataset.id;
        cloud.setActiveEmployeeId(state.activeId);
        state.route = 'sheet';
        render();
        window.scrollTo({ top: 0 });
        break;

      case 'delete-employee':
        confirmDelete(target.dataset.id);
        break;

      case 'elevate':
        promptElevate();
        break;

      case 'rotate':
        promptRotate();
        break;

      case 'drop-admin':
        cloud.dropAdmin();
        render();
        toast('Admin mode off — staff access kept');
        break;

      case 'sign-out':
        cloud.signOut();
        location.reload();
        break;

      case 'import-media':
        promptImportMedia();
        break;

      case 'export-media':
        download('training-links.json', JSON.stringify(mediaMap(), null, 2));
        break;

      case 'export-all':
        download(
          `check-sheet-backup-${new Date().toISOString().slice(0, 10)}.json`,
          JSON.stringify({ exportedAt: new Date().toISOString(), settings: state.settings, employees: state.employees }, null, 2),
        );
        break;

      case 'edit-labels':
        promptLabels();
        break;

      default:
        break;
    }
  });

  view.addEventListener('change', async (event) => {
    const target = event.target.closest('[data-act]');
    if (!target) return;
    const employee = activeEmployee();

    if (target.dataset.act === 'set-brand') {
      state.settings = await cloud.saveSetting('brand', target.value);
      applyBrand(target.value);
      toast('Brand updated');
      renderStatus();
      return;
    }

    if (target.dataset.act === 'welcome-enabled') {
      state.settings = await cloud.saveSetting('welcome', { ...(state.settings.welcome || {}), enabled: target.value === 'on' });
      toast('Welcome block updated');
      renderStatus();
      return;
    }

    if (target.dataset.act === 'welcome-field') {
      state.settings = await cloud.saveSetting('welcome', {
        ...(state.settings.welcome || {}),
        [target.dataset.field]: target.value,
      });
      toast('Welcome block saved');
      renderStatus();
      return;
    }

    if (target.dataset.act === 'set-media') {
      const media = { ...mediaMap() };
      const value = target.value.trim();
      if (value) media[target.dataset.key] = value;
      else delete media[target.dataset.key];
      state.settings = await cloud.saveSetting('media', media);
      toast('Link saved');
      renderStatus();
      return;
    }

    if (!employee) return;

    if (target.dataset.act === 'initials') {
      employee.initials = { ...(employee.initials || {}), [target.dataset.id]: target.value.toUpperCase() };
      queueSave(employee);
    } else if (target.dataset.act === 'signoff') {
      employee.managerSignoffs = { ...(employee.managerSignoffs || {}), [target.dataset.id]: target.value.toUpperCase() };
      queueSave(employee);
    } else if (target.dataset.act === 'signature') {
      employee.signatures = { ...(employee.signatures || {}), [target.dataset.key]: target.value };
      queueSave(employee);
    } else if (target.dataset.act === 'sign') {
      employee.policySignatures = { ...(employee.policySignatures || {}), [target.dataset.key]: target.value };
      queueSave(employee);
    }
  });
}

/* -------------------------------- prompts ------------------------------- */

function promptEmployee() {
  overlay(
    `<h2>Add new hire</h2>
     <p class="muted">Their 30 days start from the date you set here.</p>
     <form id="emp-form">
       <div class="row">
         <label class="field"><span>First name</span><input name="firstName" required /></label>
         <label class="field"><span>Last name</span><input name="lastName" required /></label>
       </div>
       <label class="field"><span>Employee / clock-in number</span><input name="employeeId" required /></label>
       <label class="field"><span>Start date</span><input name="startDate" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></label>
       <button class="btn block" type="submit">Add and open check sheet</button>
     </form>`,
    (sheet, close) => {
      sheet.querySelector('#emp-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const employee = {
          id: uid(),
          firstName: String(data.get('firstName')).trim(),
          lastName: String(data.get('lastName')).trim(),
          employeeId: String(data.get('employeeId')).trim(),
          startDate: String(data.get('startDate')),
          checked: {},
          initials: {},
          managerSignoffs: {},
          signatures: {},
          policySignatures: {},
          watchedVideos: {},
          appOpenCount: 1,
          updatedAt: new Date().toISOString(),
        };
        state.employees.push(employee);
        close();
        state.activeId = employee.id;
        cloud.setActiveEmployeeId(employee.id);
        state.route = 'sheet';
        render();
        await cloud.saveEmployee(employee);
        renderStatus();
        toast('New hire added');
      });
    },
  );
}

function promptMedia(key, label) {
  overlay(
    `<h2>Add link</h2>
     <p class="muted">${esc(label)}<br /><span class="tiny">key <code>${esc(key)}</code></span></p>
     <form id="media-form">
       <label class="field"><span>URL</span><input name="url" type="url" placeholder="https://…" required /></label>
       <button class="btn block" type="submit">Save link</button>
     </form>`,
    (sheet, close) => {
      sheet.querySelector('#media-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const url = String(new FormData(event.currentTarget).get('url')).trim();
        state.settings = await cloud.saveSetting('media', { ...mediaMap(), [key]: url });
        close();
        render();
        toast('Link saved');
      });
    },
  );
}

function promptImportMedia() {
  overlay(
    `<h2>Bulk import links</h2>
     <p class="muted">Paste a JSON object of <code>{ "media-key": "https://…" }</code>. Existing keys are overwritten; the rest are left alone.</p>
     <form id="imp-form">
       <label class="field"><span>JSON</span><textarea name="json" rows="10" placeholder='{ "p1-1": "https://youtu.be/…" }' required></textarea></label>
       <button class="btn block" type="submit">Import</button>
       <p class="err hidden" id="imp-err"></p>
     </form>`,
    (sheet, close) => {
      sheet.querySelector('#imp-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = sheet.querySelector('#imp-err');
        try {
          const parsed = JSON.parse(String(new FormData(event.currentTarget).get('json')));
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object');
          const media = { ...mediaMap() };
          let count = 0;
          for (const [key, value] of Object.entries(parsed)) {
            if (safeUrl(value)) {
              media[key] = String(value).trim();
              count += 1;
            }
          }
          state.settings = await cloud.saveSetting('media', media);
          close();
          render();
          toast(`Imported ${count} link${count === 1 ? '' : 's'}`);
        } catch (caught) {
          error.textContent = caught.message;
          error.classList.remove('hidden');
        }
      });
    },
  );
}

function promptLabels() {
  const labels = labelMap();
  overlay(
    `<h2>Task wording</h2>
     <p class="muted">Blank a field to fall back to the original.</p>
     <div style="max-height:52vh;overflow-y:auto;margin-bottom:14px">
       ${ALL_TASKS.map((task) => `
         <div class="media-row">
           <p class="tiny"><code>${esc(task.id)}</code>${task.day != null ? ` · day ${task.day}` : ''}</p>
           <input data-label-id="${esc(task.id)}" data-field="milestone" value="${esc(labels[task.id]?.milestone || '')}" placeholder="${esc(task.milestone)}" />
           <input data-label-id="${esc(task.id)}" data-field="description" value="${esc(labels[task.id]?.description || '')}" placeholder="${esc(task.description || 'description')}" />
         </div>`).join('')}
     </div>
     <button class="btn block" id="labels-save">Save wording</button>`,
    (sheet, close) => {
      sheet.querySelector('#labels-save').addEventListener('click', async () => {
        const next = {};
        sheet.querySelectorAll('[data-label-id]').forEach((input) => {
          const id = input.dataset.labelId;
          const value = input.value.trim();
          if (!value) return;
          next[id] = { ...(next[id] || {}), [input.dataset.field]: value };
        });
        state.settings = await cloud.saveSetting('labels', next);
        close();
        render();
        toast('Wording saved');
      });
    },
  );
}

function promptElevate() {
  overlay(
    `<h2>Admin PIN</h2>
     <p class="muted">Unlocks manager sign-offs, the roster and settings on this device.</p>
     <form id="elev-form">
       <label class="field"><span>Admin PIN</span><input name="pin" type="password" autocomplete="current-password" required /></label>
       <button class="btn block" type="submit">Unlock admin</button>
       <p class="err hidden" id="elev-err"></p>
     </form>`,
    (sheet, close) => {
      sheet.querySelector('#elev-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = sheet.querySelector('#elev-err');
        try {
          const scope = await cloud.unlock(String(new FormData(event.currentTarget).get('pin')));
          if (scope !== 'admin') throw new Error('That is the staff access code, not the admin PIN.');
          close();
          await refresh({ silent: true });
          render();
          toast('Admin unlocked');
        } catch (caught) {
          error.textContent = caught.status === 401 ? 'Wrong PIN.' : caught.message;
          error.classList.remove('hidden');
        }
      });
    },
  );
}

function promptRotate() {
  overlay(
    `<h2>Rotate codes</h2>
     <p class="muted">Leave a field blank to keep it unchanged.</p>
     <form id="rot-form">
       <label class="field"><span>Current admin PIN</span><input name="currentAdminPin" type="password" required /></label>
       <label class="field"><span>New staff access code</span><input name="accessCode" type="text" autocomplete="off" placeholder="unchanged" /></label>
       <label class="field"><span>New admin PIN</span><input name="adminPin" type="text" autocomplete="off" placeholder="unchanged" /></label>
       <button class="btn block" type="submit">Rotate</button>
       <p class="err hidden" id="rot-err"></p>
     </form>`,
    (sheet, close) => {
      sheet.querySelector('#rot-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = sheet.querySelector('#rot-err');
        const data = new FormData(event.currentTarget);
        const payload = { currentAdminPin: String(data.get('currentAdminPin')) };
        const access = String(data.get('accessCode')).trim();
        const admin = String(data.get('adminPin')).trim();
        if (access) payload.accessCode = access;
        if (admin) payload.adminPin = admin;
        if (!access && !admin) {
          error.textContent = 'Enter at least one new code.';
          error.classList.remove('hidden');
          return;
        }
        try {
          await cloud.rotateCredentials(payload);
          close();
          toast('Codes rotated');
        } catch (caught) {
          error.textContent = caught.message;
          error.classList.remove('hidden');
        }
      });
    },
  );
}

function confirmDelete(id) {
  const employee = state.employees.find((item) => item.id === id);
  if (!employee) return;
  overlay(
    `<h2>Delete ${esc(fullName(employee))}?</h2>
     <p class="muted">Their whole check sheet, initials and sign-offs are removed from the server. This cannot be undone — export a backup first if you need the record.</p>
     <div class="row">
       <button class="btn ghost" data-close>Cancel</button>
       <button class="btn danger" id="del-yes">Delete</button>
     </div>`,
    (sheet, close) => {
      sheet.querySelector('[data-close]').addEventListener('click', close);
      sheet.querySelector('#del-yes').addEventListener('click', async () => {
        state.employees = state.employees.filter((item) => item.id !== id);
        if (state.activeId === id) {
          state.activeId = '';
          cloud.setActiveEmployeeId('');
        }
        close();
        render();
        await cloud.deleteEmployee(id);
        renderStatus();
        toast('Deleted');
      });
    },
  );
}

function download(filename, contents) {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  toast('Downloaded');
}

/* --------------------------------- start -------------------------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

boot();
