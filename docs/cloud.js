/**
 * Cloud-first data layer.
 *
 * The Cloudflare Worker + D1 database is the ledger. localStorage is only a
 * read-through cache so the app still renders on a dead connection, plus an
 * outbox so a check mark made in a walk-in cooler is not lost. Nothing here is
 * authoritative on its own.
 *
 * Two credentials, both set by the owner on first run and stored server-side as
 * salted SHA-256 hashes — never in this repo:
 *   - access code : shared by all staff, unlocks the check sheet
 *   - admin PIN   : unlocks admin (curriculum, media links, sign-off authority)
 */

const API_BASE = 'https://thirty-day-training-sync.forevergoldai.workers.dev';

const LS = {
  scope: 'td_scope',
  token: 'td_token',
  employees: 'td_cache_employees',
  settings: 'td_cache_settings',
  outbox: 'td_outbox',
  activeEmployee: 'td_active_employee',
};

let onlineState = true;
const listeners = new Set();

export function onConnectionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setOnline(next) {
  if (onlineState === next) return;
  onlineState = next;
  listeners.forEach((fn) => fn(onlineState));
}

export function isOnline() {
  return onlineState;
}

/* ----------------------------------- auth ---------------------------------- */

export function storedToken() {
  return localStorage.getItem(LS.token) || '';
}

export function storedScope() {
  return localStorage.getItem(LS.scope) || '';
}

export function isAdmin() {
  return storedScope() === 'admin';
}

export function signOut() {
  localStorage.removeItem(LS.token);
  localStorage.removeItem(LS.scope);
}

/** Drops admin rights but keeps staff access, so a manager can hand the phone back. */
export function dropAdmin() {
  if (storedScope() === 'admin') localStorage.setItem(LS.scope, 'staff');
}

/** Clears a dead session after credential rotation — token + fake admin badge + stuck outbox. */
export function clearSession() {
  signOut();
  writeOutbox([]);
  setOnline(true);
}

async function request(path, { method = 'GET', body, token, allowAnonymous = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const bearer = token ?? storedToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  // No staff passcode (Thomas 2026-10-04): anonymous calls are staff; only the admin PIN is a bearer.

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    // Stale token after a credential re-claim: drop the dead session so the lock
    // screen comes back instead of an eternal "Offline — 1 change waiting" banner.
    if (response.status === 401 && bearer && !allowAnonymous) {
      clearSession();
    }
    const error = new Error(detail.error || `${method} ${path} failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

/**
 * Confirms the stored code still matches the server. Returns the live scope, or
 * null when the browser has a dead token (e.g. codes were rotated/re-claimed).
 */
export async function revalidateSession() {
  const code = storedToken();
  if (!code) return null;
  try {
    const result = await request('/api/auth/verify', {
      method: 'POST',
      body: { code },
      token: code,
    });
    localStorage.setItem(LS.scope, result.scope);
    setOnline(true);
    return result.scope;
  } catch (error) {
    if (error.status === 401) clearSession();
    else setOnline(false);
    return null;
  }
}

/** Has the owner claimed this deployment yet? */
export async function fetchStatus() {
  try {
    const status = await request('/api/status', { allowAnonymous: true });
    setOnline(true);
    return status;
  } catch (error) {
    setOnline(false);
    throw error;
  }
}

/** First-run only: sets both credentials. Rejected once already claimed. */
export async function claim(accessCode, adminPin) {
  const result = await request('/api/auth/claim', {
    method: 'POST',
    body: { accessCode, adminPin },
    allowAnonymous: true,
  });
  return result;
}

/** Verifies a code and remembers it on this device. Returns 'admin' | 'staff'. */
export async function unlock(code) {
  const result = await request('/api/auth/verify', {
    method: 'POST',
    body: { code },
    token: code,
  });
  localStorage.setItem(LS.token, code);
  localStorage.setItem(LS.scope, result.scope);
  setOnline(true);
  return result.scope;
}

export async function rotateCredentials({ currentAdminPin, accessCode, adminPin }) {
  const result = await request('/api/auth/rotate', {
    method: 'POST',
    body: { currentAdminPin, accessCode, adminPin },
  });
  if (adminPin && storedScope() === 'admin') localStorage.setItem(LS.token, adminPin);
  return result;
}

/* ---------------------------------- cache ---------------------------------- */

function readCache(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — the server still holds the record */
  }
}

export function cachedEmployees() {
  return readCache(LS.employees, []);
}

export function cachedSettings() {
  return readCache(LS.settings, {});
}

/* ---------------------------------- outbox --------------------------------- */

function readOutbox() {
  return readCache(LS.outbox, []);
}

function writeOutbox(entries) {
  writeCache(LS.outbox, entries);
}

export function pendingWrites() {
  return readOutbox().length;
}

function queue(entry) {
  const entries = readOutbox().filter((item) => item.dedupeKey !== entry.dedupeKey);
  entries.push({ ...entry, queuedAt: new Date().toISOString() });
  writeOutbox(entries);
}

/** Replays queued writes oldest-first. Safe to call repeatedly. */
export async function flushOutbox() {
  const entries = readOutbox();
  if (!entries.length || !storedToken()) return { flushed: 0, remaining: entries.length };

  const remaining = [];
  let flushed = 0;
  for (const entry of entries) {
    try {
      await request(entry.path, { method: entry.method, body: entry.body });
      flushed += 1;
    } catch (error) {
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        // Permanently rejected — dropping it beats blocking the queue forever.
        continue;
      }
      remaining.push(entry);
    }
  }
  writeOutbox(remaining);
  setOnline(remaining.length === 0 || flushed > 0);
  return { flushed, remaining: remaining.length };
}

/* --------------------------------- employees ------------------------------- */

export async function listEmployees() {
  try {
    const employees = await request('/api/employees');
    writeCache(LS.employees, employees);
    setOnline(true);
    return { employees, stale: false };
  } catch (error) {
    setOnline(false);
    return { employees: cachedEmployees(), stale: true, error };
  }
}

/**
 * Upserts an employee. Writes cache immediately so the UI never waits, then
 * pushes; on failure the push is queued and retried on the next flush.
 */
export async function saveEmployee(employee) {
  const record = { ...employee, updatedAt: new Date().toISOString() };
  const employees = cachedEmployees().filter((item) => item.id !== record.id);
  employees.push(record);
  writeCache(LS.employees, employees);

  const path = `/api/employees/${encodeURIComponent(record.id)}`;
  try {
    const saved = await request(path, { method: 'PUT', body: record });
    const merged = cachedEmployees().map((item) => (item.id === saved.id ? saved : item));
    writeCache(LS.employees, merged);
    setOnline(true);
    return saved;
  } catch (error) {
    queue({ dedupeKey: `employee:${record.id}`, path, method: 'PUT', body: record });
    setOnline(false);
    return record;
  }
}

export async function deleteEmployee(id) {
  writeCache(LS.employees, cachedEmployees().filter((item) => item.id !== id));
  const path = `/api/employees/${encodeURIComponent(id)}`;
  try {
    await request(path, { method: 'DELETE' });
  } catch {
    queue({ dedupeKey: `employee-delete:${id}`, path, method: 'DELETE' });
  }
}

/* --------------------------------- settings -------------------------------- */

export async function loadSettings() {
  try {
    const settings = await request('/api/settings');
    writeCache(LS.settings, settings);
    setOnline(true);
    return { settings, stale: false };
  } catch (error) {
    setOnline(false);
    return { settings: cachedSettings(), stale: true, error };
  }
}

export async function saveSetting(key, value) {
  const settings = { ...cachedSettings(), [key]: value };
  writeCache(LS.settings, settings);
  const path = `/api/settings/${encodeURIComponent(key)}`;
  try {
    await request(path, { method: 'PUT', body: { value } });
    setOnline(true);
  } catch {
    queue({ dedupeKey: `setting:${key}`, path, method: 'PUT', body: { value } });
    setOnline(false);
  }
  return settings;
}

/* ------------------------------ active employee ---------------------------- */

export function activeEmployeeId() {
  return localStorage.getItem(LS.activeEmployee) || '';
}

export function setActiveEmployeeId(id) {
  if (id) localStorage.setItem(LS.activeEmployee, id);
  else localStorage.removeItem(LS.activeEmployee);
}

/* Retry the outbox whenever the browser thinks it is back online. */
window.addEventListener('online', () => {
  flushOutbox().catch(() => {});
});
