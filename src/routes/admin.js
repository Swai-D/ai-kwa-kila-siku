const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const config = require('../config');
const auth = require('../admin/auth');
const { slugify, nowSql, eatInputToUtc, utcToEatInput, formatEat, cleanHtml } = require('../admin/util');

const router = express.Router();
const LANGS = ['sw', 'en'];

// --- parsers, session, CSRF -------------------------------------------------
router.use(express.urlencoded({ extended: false, limit: '2mb' }));
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.locals.formatEat = formatEat;
  res.locals.siteName = config.site.name;
  res.locals.nav = '';
  res.locals.flash = req.query.ok || null;
  next();
});
router.use(auth.loadAdmin);
router.use(auth.csrfGuard);

// --- login / logout ---------------------------------------------------------
router.get('/login', (req, res) => {
  if (req.admin) return res.redirect(303, '/admin');
  res.render('admin/login', { error: null, email: '' });
});

router.post('/login', (req, res) => {
  const ip = req.ip;
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
  const password = String(req.body.password || '').slice(0, 200);
  if (auth.loginThrottle.blocked(ip)) {
    return res.status(429).render('admin/login', { error: 'Too many attempts. Try again in 15 minutes.', email });
  }
  const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
  const ok = auth.verifyPassword(password, user ? user.password_hash : auth.DUMMY_HASH) && user;
  if (!ok) {
    auth.loginThrottle.fail(ip);
    return res.status(401).render('admin/login', { error: 'Invalid email or password.', email });
  }
  auth.loginThrottle.reset(ip);
  const session = auth.createSession(user.id);
  res.cookie(auth.COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/admin',
    maxAge: session.maxAge,
  });
  res.redirect(303, '/admin');
});

router.post('/logout', (req, res) => {
  auth.destroySession(req.cookies[auth.COOKIE]);
  res.clearCookie(auth.COOKIE, { path: '/admin' });
  res.redirect(303, '/admin/login');
});

// Everything below needs a logged-in admin.
router.use(auth.requireAdmin);

// --- dashboard --------------------------------------------------------------
const stateOf = (p) =>
  p.status === 'draft' ? 'draft' : p.published_at > nowSql() ? 'scheduled' : 'published';

function listPosts(limit) {
  const rows = db
    .prepare(
      `SELECT p.id, p.status, p.published_at, p.views, p.cover_image,
              (SELECT title FROM post_translations WHERE post_id = p.id AND lang = 'sw') AS title_sw,
              (SELECT title FROM post_translations WHERE post_id = p.id AND lang = 'en') AS title_en,
              (SELECT slug FROM post_translations WHERE post_id = p.id AND lang = 'sw') AS slug_sw,
              (SELECT slug FROM post_translations WHERE post_id = p.id AND lang = 'en') AS slug_en,
              c.name_en AS category
       FROM posts p LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY COALESCE(p.published_at, p.created_at) DESC ${limit ? 'LIMIT ' + Number(limit) : ''}`
    )
    .all();
  return rows.map((p) => ({ ...p, state: stateOf(p) }));
}

router.get('/', (req, res) => {
  const all = listPosts();
  const count = (s) => all.filter((p) => p.state === s).length;
  res.render('admin/dashboard', {
    nav: 'dashboard',
    stats: {
      published: count('published'),
      scheduled: count('scheduled'),
      drafts: count('draft'),
      views: all.reduce((n, p) => n + p.views, 0),
      subscribers: db.prepare('SELECT COUNT(*) AS n FROM subscribers').get().n,
    },
    recent: all.slice(0, 6),
  });
});

// --- posts: list ------------------------------------------------------------
router.get('/posts', (req, res) => {
  res.render('admin/posts', { nav: 'posts', posts: listPosts() });
});

// --- posts: form helpers ----------------------------------------------------
const blankLang = () => ({ title: '', slug: '', excerpt: '', body: '' });

function formDefaults() {
  return {
    id: null, status: 'draft', publish_at: '', category_id: '', cover_image: '', tags: [],
    sw: blankLang(), en: blankLang(),
  };
}

function loadPost(id) {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!p) return null;
  const form = {
    ...formDefaults(),
    id: p.id,
    status: p.status,
    publish_at: utcToEatInput(p.published_at),
    category_id: p.category_id || '',
    cover_image: p.cover_image || '',
    tags: db.prepare('SELECT tag_id FROM post_tags WHERE post_id = ?').all(id).map((r) => r.tag_id),
  };
  db.prepare('SELECT lang, slug, title, excerpt, body FROM post_translations WHERE post_id = ?')
    .all(id)
    .forEach((t) => (form[t.lang] = { title: t.title, slug: t.slug, excerpt: t.excerpt, body: t.body }));
  return form;
}

function renderForm(res, form, errors = [], status = 200) {
  res.status(status).render('admin/post-form', {
    nav: 'posts',
    form,
    errors,
    categories: db.prepare('SELECT id, name_en, name_sw FROM categories ORDER BY id').all(),
    allTags: db.prepare('SELECT id, name_en, name_sw FROM tags ORDER BY name_en').all(),
  });
}

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function parseForm(body, postId) {
  const errors = [];
  const form = {
    ...formDefaults(),
    id: postId,
    status: body.status === 'published' ? 'published' : 'draft',
    publish_at: str(body.publish_at, 20),
    category_id: str(body.category_id, 10),
    cover_image: str(body.cover_image, 300),
    tags: [].concat(body.tags || []).map((t) => parseInt(t, 10)).filter(Number.isInteger),
  };

  for (const lang of LANGS) {
    form[lang] = {
      title: str(body[`${lang}_title`], 200),
      slug: str(body[`${lang}_slug`], 100),
      excerpt: str(body[`${lang}_excerpt`], 400),
      body: cleanHtml(body[`${lang}_body`]),
    };
  }
  const filled = LANGS.filter((l) => form[l].title);
  if (!filled.length) errors.push('Add a title in at least one language (Swahili or English).');
  for (const lang of LANGS) {
    const t = form[lang];
    if (!t.title && (t.body || t.excerpt)) {
      errors.push(`${lang === 'sw' ? 'Swahili' : 'English'}: add a title, or clear the text. A language without a title is not saved.`);
    }
  }

  if (form.cover_image && !/^\/uploads\/[\w.-]+$/.test(form.cover_image)) {
    errors.push('Cover image must be an uploaded image.');
  }
  if (form.category_id && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(form.category_id)) {
    errors.push('Unknown category.');
  }

  // Publish time (entered in Dar es Salaam time, stored in UTC).
  let publishedAt = null;
  if (form.publish_at) {
    publishedAt = eatInputToUtc(form.publish_at);
    if (!publishedAt) errors.push('Publish date is not valid.');
  }
  if (form.status === 'published' && !form.publish_at) publishedAt = nowSql();

  // Slugs: auto-generated ones get a numeric suffix when taken; typed ones must be free.
  const slugs = {};
  const taken = (lang, s) =>
    db.prepare('SELECT 1 FROM post_translations WHERE lang = ? AND slug = ? AND post_id != ?').get(lang, s, postId || 0);
  for (const lang of filled) {
    const t = form[lang];
    const typed = slugify(t.slug);
    let slug = typed || slugify(t.title) || `post-${Date.now().toString(36)}`;
    if (typed) {
      if (taken(lang, slug)) errors.push(`${lang === 'sw' ? 'Swahili' : 'English'} slug "${slug}" is already used by another post.`);
    } else {
      const base = slug;
      for (let i = 2; taken(lang, slug); i++) slug = `${base}-${i}`;
    }
    slugs[lang] = slug;
    t.slug = slug;
  }
  return { errors, form, publishedAt, slugs, filled };
}

function savePost(parsed, postId) {
  const { form, publishedAt, slugs, filled } = parsed;
  const tx = db.transaction(() => {
    let id = postId;
    const cols = [form.cover_image || null, form.status, publishedAt, form.category_id ? Number(form.category_id) : null];
    if (id) {
      db.prepare(
        `UPDATE posts SET cover_image=?, status=?, published_at=?, category_id=?, updated_at=datetime('now') WHERE id=?`
      ).run(...cols, id);
    } else {
      id = db
        .prepare('INSERT INTO posts (cover_image,status,published_at,category_id,author_id) VALUES (?,?,?,?,?)')
        .run(...cols, parsed.authorId).lastInsertRowid;
    }
    for (const lang of LANGS) {
      if (filled.includes(lang)) {
        const t = form[lang];
        db.prepare(
          `INSERT INTO post_translations (post_id,lang,slug,title,excerpt,body) VALUES (?,?,?,?,?,?)
           ON CONFLICT(post_id,lang) DO UPDATE SET slug=excluded.slug, title=excluded.title,
             excerpt=excluded.excerpt, body=excluded.body`
        ).run(id, lang, slugs[lang], t.title, t.excerpt, t.body);
      } else {
        db.prepare('DELETE FROM post_translations WHERE post_id = ? AND lang = ?').run(id, lang);
      }
    }
    db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(id);
    const ins = db.prepare('INSERT OR IGNORE INTO post_tags (post_id,tag_id) SELECT ?, id FROM tags WHERE id = ?');
    form.tags.forEach((tagId) => ins.run(id, tagId));
    return id;
  });
  return tx();
}

// --- posts: create / edit / delete ------------------------------------------
router.get('/posts/new', (req, res) => renderForm(res, formDefaults()));

router.post('/posts', (req, res) => {
  const parsed = parseForm(req.body, null);
  if (parsed.errors.length) return renderForm(res, parsed.form, parsed.errors, 422);
  parsed.authorId = req.admin.id;
  const id = savePost(parsed, null);
  res.redirect(303, `/admin/posts/${id}/edit?ok=created`);
});

function postIdParam(req) {
  const id = parseInt(req.params.id, 10);
  return Number.isInteger(id) ? id : null;
}

router.get('/posts/:id/edit', (req, res, next) => {
  const id = postIdParam(req);
  const form = id && loadPost(id);
  if (!form) return next();
  renderForm(res, form);
});

router.post('/posts/:id', (req, res, next) => {
  const id = postIdParam(req);
  if (!id || !db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id)) return next();
  const parsed = parseForm(req.body, id);
  if (parsed.errors.length) return renderForm(res, parsed.form, parsed.errors, 422);
  savePost(parsed, id);
  res.redirect(303, `/admin/posts/${id}/edit?ok=saved`);
});

router.post('/posts/:id/delete', (req, res, next) => {
  const id = postIdParam(req);
  if (!id) return next();
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.redirect(303, '/admin/posts?ok=deleted');
});

// --- image upload (cover image + editor) ------------------------------------
fs.mkdirSync(config.uploadDir, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(EXT[file.mimetype] ? null : new Error('Only JPG, PNG, WebP or GIF images are allowed.'), !!EXT[file.mimetype]),
});

router.post('/media/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    db.prepare('INSERT INTO media (filename, original_name, mime, size) VALUES (?,?,?,?)').run(
      req.file.filename, req.file.originalname.slice(0, 200), req.file.mimetype, req.file.size
    );
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// --- admin 404 --------------------------------------------------------------
router.use((req, res) => res.status(404).render('admin/404', { nav: '' }));

module.exports = router;
