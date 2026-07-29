/**
 * 30-Day Check Sheet sync worker.
 *
 * D1 is the ledger; the PWA treats localStorage as a cache only. Two shared
 * credentials live here as salted SHA-256 hashes, set once by the owner through
 * /api/auth/claim and rotatable through /api/auth/rotate:
 *   access code -> scope "staff" (read the sheet, tick boxes, initial)
 *   admin PIN   -> scope "admin" (staff rights + curriculum, media, deletes)
 *
 * No credential value is ever stored in plaintext, logged, or returned.
 */

interface Env {
  DB: D1Database;
}

type Scope = 'admin' | 'staff';

const ALLOWED_ORIGINS = ['https://thomasg42.github.io'];
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (LOCALHOST.test(origin)) return origin;
  return null;
}

function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });
  const origin = allowedOrigin(request);
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

function json(request: Request, payload: unknown, status = 200): Response {
  const headers = corsHeaders(request);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(payload), { status, headers });
}

function fail(request: Request, message: string, status: number): Response {
  return json(request, { error: message }, status);
}

/* ------------------------------- credentials ------------------------------- */

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashCode(salt: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Length-independent compare so a wrong guess costs the same time. */
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

type CredentialRow = { name: string; salt: string; hash: string };

async function readCredential(env: Env, name: string): Promise<CredentialRow | null> {
  return env.DB.prepare('SELECT name, salt, hash FROM credentials WHERE name = ?')
    .bind(name)
    .first<CredentialRow>();
}

async function writeCredential(env: Env, name: string, code: string): Promise<void> {
  const salt = randomSalt();
  const hash = await hashCode(salt, code);
  await env.DB.prepare(
    `INSERT INTO credentials (name, salt, hash, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET salt = excluded.salt, hash = excluded.hash, updated_at = excluded.updated_at`,
  )
    .bind(name, salt, hash, new Date().toISOString())
    .run();
}

async function claimed(env: Env): Promise<boolean> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM credentials').first<{ total: number }>();
  return Boolean(row && row.total > 0);
}

async function scopeFor(env: Env, request: Request): Promise<Scope | null> {
  const header = request.headers.get('Authorization') || '';
  const code = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!code) return null;

  const admin = await readCredential(env, 'admin_pin');
  if (admin && sameHash(await hashCode(admin.salt, code), admin.hash)) return 'admin';

  const staff = await readCredential(env, 'access_code');
  if (staff && sameHash(await hashCode(staff.salt, code), staff.hash)) return 'staff';

  return null;
}

function validCode(value: unknown, minLength: number): value is string {
  return typeof value === 'string' && value.trim().length >= minLength && value.trim().length <= 64;
}

/* --------------------------------- merging -------------------------------- */

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Two managers can have the same trainee open. Merge the progress maps key by
 * key instead of letting the last full save clobber the other's sign-offs.
 */
function mergeMaps(current: unknown, incoming: unknown): Dict {
  const base = isDict(current) ? { ...current } : {};
  if (!isDict(incoming)) return base;
  for (const [key, value] of Object.entries(incoming)) {
    const existing = base[key];
    const incomingIsEmpty = value === false || value === '' || value === null || value === undefined;
    // An explicit un-check wins only if nothing is already recorded, so a
    // stale device cannot silently erase a completed milestone.
    if (incomingIsEmpty && existing !== undefined && existing !== false && existing !== '') continue;
    base[key] = value;
  }
  return base;
}

const MAP_FIELDS = ['checked', 'initials', 'managerSignoffs', 'signatures', 'policySignatures', 'watchedVideos'];

function mergeEmployee(current: Dict | null, incoming: Dict): Dict {
  if (!current) return incoming;
  const currentTime = Date.parse(String(current.updatedAt || 0));
  const incomingTime = Date.parse(String(incoming.updatedAt || 0));
  const incomingIsNewer = !Number.isFinite(currentTime) || (Number.isFinite(incomingTime) && incomingTime >= currentTime);

  const merged: Dict = incomingIsNewer ? { ...current, ...incoming } : { ...incoming, ...current };
  for (const field of MAP_FIELDS) {
    merged[field] = mergeMaps(current[field], incoming[field]);
  }
  merged.appOpenCount = Math.max(Number(current.appOpenCount) || 0, Number(incoming.appOpenCount) || 0);
  merged.updatedAt = new Date().toISOString();
  return merged;
}

/* --------------------------------- routing -------------------------------- */

function employeeId(pathname: string): string | null {
  const match = /^\/api\/employees\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

function settingKey(pathname: string): string | null {
  const match = /^\/api\/settings\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (!allowedOrigin(request)) {
      return fail(request, 'Origin not allowed', 403);
    }

    const url = new URL(request.url);
    const { pathname } = url;

    /* ---- status: the only route that never needs a credential ---- */
    if (pathname === '/api/status' && request.method === 'GET') {
      return json(request, { claimed: await claimed(env) });
    }

    /* ---- first-run claim ---- */
    if (pathname === '/api/auth/claim' && request.method === 'POST') {
      if (await claimed(env)) return fail(request, 'Already set up. Use rotate instead.', 409);
      const body = (await request.json().catch(() => ({}))) as Dict;
      if (!validCode(body.accessCode, 4)) return fail(request, 'Access code must be at least 4 characters', 400);
      if (!validCode(body.adminPin, 6)) return fail(request, 'Admin PIN must be at least 6 characters', 400);
      if (String(body.accessCode).trim() === String(body.adminPin).trim()) {
        return fail(request, 'Access code and admin PIN must be different', 400);
      }
      await writeCredential(env, 'access_code', String(body.accessCode).trim());
      await writeCredential(env, 'admin_pin', String(body.adminPin).trim());
      return json(request, { claimed: true }, 201);
    }

    if (pathname === '/api/auth/verify' && request.method === 'POST') {
      const scope = await scopeFor(env, request);
      if (!scope) return fail(request, 'Wrong code', 401);
      return json(request, { scope });
    }

    /* ---- everything below needs at least staff scope ---- */
    const scope = await scopeFor(env, request);
    if (!scope) return fail(request, 'Not unlocked', 401);
    const requireAdmin = () => scope === 'admin';

    if (pathname === '/api/auth/rotate' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Dict;
      const admin = await readCredential(env, 'admin_pin');
      const supplied = String(body.currentAdminPin || '');
      if (!admin || !sameHash(await hashCode(admin.salt, supplied), admin.hash)) {
        return fail(request, 'Current admin PIN is wrong', 401);
      }
      if (body.accessCode !== undefined) {
        if (!validCode(body.accessCode, 4)) return fail(request, 'Access code must be at least 4 characters', 400);
        await writeCredential(env, 'access_code', String(body.accessCode).trim());
      }
      if (body.adminPin !== undefined) {
        if (!validCode(body.adminPin, 6)) return fail(request, 'Admin PIN must be at least 6 characters', 400);
        await writeCredential(env, 'admin_pin', String(body.adminPin).trim());
      }
      return json(request, { rotated: true });
    }

    if (pathname === '/api/employees' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT data FROM employees ORDER BY updated_at DESC').all<{ data: string }>();
      const employees = (rows.results || []).map((row) => JSON.parse(row.data));
      return json(request, employees);
    }

    const id = employeeId(pathname);
    if (id && request.method === 'PUT') {
      const incoming = (await request.json().catch(() => null)) as Dict | null;
      if (!incoming) return fail(request, 'Body must be a JSON object', 400);
      const existing = await env.DB.prepare('SELECT data FROM employees WHERE id = ?')
        .bind(id)
        .first<{ data: string }>();
      const current = existing ? (JSON.parse(existing.data) as Dict) : null;
      const merged = mergeEmployee(current, { ...incoming, id });
      await env.DB.prepare(
        `INSERT INTO employees (id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      )
        .bind(id, JSON.stringify(merged), String(merged.updatedAt))
        .run();
      return json(request, merged);
    }

    if (id && request.method === 'DELETE') {
      if (!requireAdmin()) return fail(request, 'Admin PIN required', 403);
      await env.DB.prepare('DELETE FROM employees WHERE id = ?').bind(id).run();
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (pathname === '/api/settings' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
      const settings: Dict = {};
      for (const row of rows.results || []) {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      }
      return json(request, settings);
    }

    const key = settingKey(pathname);
    if (key && request.method === 'PUT') {
      if (!requireAdmin()) return fail(request, 'Admin PIN required', 403);
      const body = (await request.json().catch(() => ({}))) as Dict;
      await env.DB.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
        .bind(key, JSON.stringify(body.value ?? null), new Date().toISOString())
        .run();
      return json(request, { key, saved: true });
    }

    return fail(request, 'Not found', 404);
  },
};
