const crypto = require('crypto');
const db = require('../db');

const SESSION_DAYS = 14;
const COOKIE = 'sid';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Burn the same CPU time when the user does not exist, so timing does not reveal valid emails.
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString('hex'));
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const sqlTime = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

function createSession(userId) {
  const id = crypto.randomBytes(32).toString('hex');
  const csrf = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  db.prepare('INSERT INTO sessions (id_hash,user_id,csrf,expires_at) VALUES (?,?,?,?)').run(
    sha(id), userId, csrf, sqlTime(expires)
  );
  return { id, maxAge: SESSION_DAYS * 24 * 3600 * 1000 };
}

function destroySession(id) {
  if (id) db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(sha(id));
}

// Attaches req.admin = { id, name, email, csrf } when the cookie holds a valid session.
function loadAdmin(req, res, next) {
  const id = req.cookies && req.cookies[COOKIE];
  if (id && /^[0-9a-f]{64}$/.test(id)) {
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.email, s.csrf FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id_hash = ? AND s.expires_at > datetime('now')`
      )
      .get(sha(id));
    if (row) {
      req.admin = row;
      res.locals.admin = row;
      res.locals.csrfToken = row.csrf;
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.admin) return next();
  if (req.method === 'GET') return res.redirect(303, '/admin/login');
  res.status(401).type('text').send('Please log in again.');
}

// Same-origin check for every POST, plus the per-session token for authenticated POSTs.
function csrfGuard(req, res, next) {
  if (req.method !== 'POST') return next();
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    if (host !== req.headers.host) return res.status(403).type('text').send('Forbidden (origin)');
  }
  if (req.admin) {
    const sent = String((req.body && req.body._csrf) || req.headers['x-csrf-token'] || '');
    const a = Buffer.from(sent);
    const b = Buffer.from(req.admin.csrf);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).type('text').send('Forbidden (invalid token). Reload the page and try again.');
    }
  }
  next();
}

// Login throttle: 8 failures per 15 minutes per IP.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const loginThrottle = {
  blocked(ip) {
    const a = attempts.get(ip);
    if (!a) return false;
    if (Date.now() - a.first > WINDOW_MS) {
      attempts.delete(ip);
      return false;
    }
    return a.count >= MAX_FAILS;
  },
  fail(ip) {
    const a = attempts.get(ip);
    if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(ip, { count: 1, first: Date.now() });
    else a.count += 1;
  },
  reset(ip) {
    attempts.delete(ip);
  },
};

module.exports = {
  COOKIE, hashPassword, verifyPassword, DUMMY_HASH, createSession, destroySession,
  loadAdmin, requireAdmin, csrfGuard, loginThrottle,
};
