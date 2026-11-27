// Admin: categories, tags, media library and site settings.
// Mounted by routes/admin.js after login + CSRF checks, so everything here is authenticated.
const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../db');
const config = require('../config');
const settings = require('../settings');
const { slugify, cleanHtml } = require('../admin/util');

const router = express.Router();
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

// --- categories and tags (same screen, different table) ----------------------
const TAXONOMIES = {
  categories: {
    path: 'categories', table: 'categories', title: 'Categories', singular: 'category', hasDesc: true,
    count: '(SELECT COUNT(*) FROM posts WHERE category_id = t.id)',
    deleteNote: 'Posts in it will stay, but without a category.',
  },
  tags: {
    path: 'tags', table: 'tags', title: 'Tags', singular: 'tag', hasDesc: false,
    count: '(SELECT COUNT(*) FROM post_tags WHERE tag_id = t.id)',
    deleteNote: 'It will be removed from all posts.',
  },
};

function taxonomyPage(res, cfg, form, errors = [], status = 200) {
  const rows = db.prepare(`SELECT t.*, ${cfg.count} AS posts FROM ${cfg.table} t ORDER BY t.name_en`).all();
  res.status(status).render('admin/taxonomy', { nav: cfg.path, cfg, rows, form, errors });
}

const blankTerm = () => ({ id: null, slug: '', name_sw: '', name_en: '', desc_sw: '', desc_en: '' });

for (const cfg of Object.values(TAXONOMIES)) {
  const base = `/${cfg.path}`;
  const idOf = (req) => {
    const n = parseInt(req.params.id, 10);
    return Number.isInteger(n) ? n : null;
  };

  router.get(base, (req, res) => {
    const id = parseInt(req.query.edit, 10);
    const form = (Number.isInteger(id) && db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id)) || blankTerm();
    taxonomyPage(res, cfg, form);
  });

  function save(req, res, id) {
    const form = {
      id,
      name_sw: str(req.body.name_sw, 80),
      name_en: str(req.body.name_en, 80),
      slug: str(req.body.slug, 80),
      desc_sw: cfg.hasDesc ? str(req.body.desc_sw, 160) : '',
      desc_en: cfg.hasDesc ? str(req.body.desc_en, 160) : '',
    };
    const errors = [];
    // One language is enough: the other falls back to it.
    if (!form.name_sw && !form.name_en) errors.push('Enter a name in at least one language.');
    form.name_sw = form.name_sw || form.name_en;
    form.name_en = form.name_en || form.name_sw;
    form.slug = slugify(form.slug || form.name_en);
    if (!form.slug && !errors.length) errors.push('The name must contain letters or numbers.');
    if (form.slug && db.prepare(`SELECT 1 FROM ${cfg.table} WHERE slug = ? AND id != ?`).get(form.slug, id || 0)) {
      errors.push(`The slug "${form.slug}" is already used.`);
    }
    if (errors.length) return taxonomyPage(res, cfg, form, errors, 422);

    if (id) {
      if (cfg.hasDesc) {
        db.prepare('UPDATE categories SET slug=?, name_sw=?, name_en=?, desc_sw=?, desc_en=? WHERE id=?')
          .run(form.slug, form.name_sw, form.name_en, form.desc_sw, form.desc_en, id);
      } else {
        db.prepare('UPDATE tags SET slug=?, name_sw=?, name_en=? WHERE id=?').run(form.slug, form.name_sw, form.name_en, id);
      }
    } else if (cfg.hasDesc) {
      db.prepare('INSERT INTO categories (slug,name_sw,name_en,desc_sw,desc_en) VALUES (?,?,?,?,?)')
        .run(form.slug, form.name_sw, form.name_en, form.desc_sw, form.desc_en);
    } else {
      db.prepare('INSERT INTO tags (slug,name_sw,name_en) VALUES (?,?,?)').run(form.slug, form.name_sw, form.name_en);
    }
    res.redirect(303, `/admin${base}?ok=${id ? 'saved' : 'created'}`);
  }

  router.post(base, (req, res) => save(req, res, null));
  router.post(`${base}/:id`, (req, res, next) => {
    const id = idOf(req);
    if (!id || !db.prepare(`SELECT 1 FROM ${cfg.table} WHERE id = ?`).get(id)) return next();
    save(req, res, id);
  });
  router.post(`${base}/:id/delete`, (req, res, next) => {
    const id = idOf(req);
    if (!id) return next();
    db.prepare(`DELETE FROM ${cfg.table} WHERE id = ?`).run(id);
    res.redirect(303, `/admin${base}?ok=deleted`);
  });
}

// --- media library -----------------------------------------------------------
function mediaUsage(url) {
  const where = [];
  const like = `%${url.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
  const posts = db
    .prepare(
      `SELECT DISTINCT p.id,
         COALESCE((SELECT title FROM post_translations WHERE post_id = p.id AND lang='sw'),
                  (SELECT title FROM post_translations WHERE post_id = p.id AND lang='en'), '#' || p.id) AS title
       FROM posts p
       WHERE p.cover_image = @url
          OR EXISTS (SELECT 1 FROM post_translations t WHERE t.post_id = p.id AND t.body LIKE @like ESCAPE '\\')`
    )
    .all({ url, like });
  posts.forEach((p) => where.push(`post “${p.title}”`));
  const s = settings.all();
  Object.entries(s).forEach(([k, v]) => {
    if (v === url || (k.startsWith('about_page_') && String(v).includes(url))) where.push(`setting “${k}”`);
  });
  return where;
}

router.get('/media', (req, res) => {
  const items = db.prepare('SELECT * FROM media ORDER BY id DESC').all().map((m) => ({
    ...m,
    url: `/uploads/${m.filename}`,
    kb: Math.max(1, Math.round(m.size / 1024)),
    missing: !fs.existsSync(path.join(config.uploadDir, m.filename)),
  }));
  res.render('admin/media', { nav: 'media', items, error: req.query.err || null });
});

router.post('/media/:id/delete', (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const m = Number.isInteger(id) && db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  if (!m) return next();
  const usedBy = mediaUsage(`/uploads/${m.filename}`);
  if (usedBy.length) {
    const msg = `Cannot delete: used in ${usedBy.slice(0, 3).join(', ')}${usedBy.length > 3 ? ` and ${usedBy.length - 3} more` : ''}.`;
    return res.redirect(303, `/admin/media?err=${encodeURIComponent(msg)}`);
  }
  // filename is generated by the server; basename() is a belt-and-braces guard
  fs.rm(path.join(config.uploadDir, path.basename(m.filename)), { force: true }, () => {});
  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  res.redirect(303, '/admin/media?ok=deleted');
});

// --- settings ------------------------------------------------------------------
const imageOk = (v) => v === '' || /^\/(uploads|images)\/[\w.-]+$/.test(v);
const urlOk = (v) => v === '' || /^https?:\/\/[^\s<>"']+$/.test(v);

function settingsPage(res, form, errors = [], status = 200) {
  res.status(status).render('admin/settings', { nav: 'settings', form, errors });
}

router.get('/settings', (req, res) => settingsPage(res, { ...settings.all() }));

router.post('/settings', (req, res) => {
  const b = req.body;
  const form = {
    site_name: str(b.site_name, 60),
    author_name: str(b.author_name, 60),
    author_avatar: str(b.author_avatar, 200),
    logo: str(b.logo, 200),
    tagline_sw: str(b.tagline_sw, 200),
    tagline_en: str(b.tagline_en, 200),
    about_sw: str(b.about_sw, 500),
    about_en: str(b.about_en, 500),
    about_page_sw: cleanHtml(str(b.about_page_sw, 20000)),
    about_page_en: cleanHtml(str(b.about_page_en, 20000)),
    social_twitter: str(b.social_twitter, 300),
    social_facebook: str(b.social_facebook, 300),
    social_instagram: str(b.social_instagram, 300),
    social_email: str(b.social_email, 254),
  };
  const errors = [];
  if (!form.site_name) errors.push('Blog name is required.');
  if (!form.author_name) errors.push('Author name is required.');
  if (!imageOk(form.author_avatar)) errors.push('Author photo must be an uploaded image.');
  if (!imageOk(form.logo)) errors.push('Logo must be an uploaded image.');
  ['twitter', 'facebook', 'instagram'].forEach((k) => {
    if (!urlOk(form[`social_${k}`])) errors.push(`${k[0].toUpperCase() + k.slice(1)} link must start with http:// or https://`);
  });
  if (form.social_email && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(form.social_email)) {
    errors.push('Contact email is not valid.');
  }
  if (errors.length) return settingsPage(res, form, errors, 422);
  // Empty image fields mean "use the built-in default".
  form.author_avatar = form.author_avatar || settings.DEFAULTS.author_avatar;
  form.logo = form.logo || settings.DEFAULTS.logo;
  settings.save(form);
  res.redirect(303, '/admin/settings?ok=saved');
});

module.exports = router;
