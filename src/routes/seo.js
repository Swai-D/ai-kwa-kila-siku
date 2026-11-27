// robots.txt and sitemap.xml (site-wide). Per-language RSS lives in routes/public.js.
const express = require('express');
const db = require('../db');
const config = require('../config');

const router = express.Router();
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const iso = (sql) => `${sql.replace(' ', 'T')}Z`;

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Disallow: /admin', 'Disallow: /*/search', '', `Sitemap: ${config.siteUrl}/sitemap.xml`, ''].join('\n')
  );
});

router.get('/sitemap.xml', (req, res) => {
  const base = config.siteUrl;
  const urls = [];
  const alt = (map) =>
    Object.entries(map)
      .map(([l, loc]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(base + loc)}"/>`)
      .join('');
  const add = (locs, lastmod) => {
    for (const [lang, loc] of Object.entries(locs)) {
      urls.push(
        `<url><loc>${esc(base + loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${alt(locs)}</url>`
      );
    }
  };

  add({ sw: '/sw/', en: '/en/' });
  add({ sw: '/sw/about', en: '/en/about' });

  for (const c of db.prepare('SELECT slug FROM categories ORDER BY id').all()) {
    add({ sw: `/sw/category/${c.slug}`, en: `/en/category/${c.slug}` });
  }

  const rows = db
    .prepare(
      `SELECT p.id, p.updated_at, t.lang, t.slug
       FROM posts p JOIN post_translations t ON t.post_id = p.id
       WHERE p.status = 'published' AND p.published_at <= datetime('now')
       ORDER BY p.published_at DESC`
    )
    .all();
  const byPost = new Map();
  for (const r of rows) {
    if (!byPost.has(r.id)) byPost.set(r.id, { lastmod: iso(r.updated_at), locs: {} });
    byPost.get(r.id).locs[r.lang] = `/${r.lang}/post/${r.slug}`;
  }
  for (const { locs, lastmod } of byPost.values()) add(locs, lastmod);

  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
    );
});

module.exports = router;
