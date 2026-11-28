const db = require('./db');
const config = require('./config');

// Only posts that are published, already due, and translated into `lang` are public.
const PUBLIC = `p.status = 'published' AND p.published_at <= datetime('now') AND t.lang = @lang`;

const SELECT = `
  SELECT p.id, p.cover_image, p.published_at, p.updated_at, p.views,
         t.slug, t.title, t.excerpt, t.body,
         c.slug AS category_slug,
         CASE @lang WHEN 'sw' THEN c.name_sw ELSE c.name_en END AS category_name
  FROM posts p
  JOIN post_translations t ON t.post_id = p.id
  LEFT JOIN categories c ON c.id = p.category_id`;

function escapeLike(s) {
  return s.replace(/[\\%_]/g, (m) => '\\' + m);
}

function paged(where, params, page) {
  const limit = config.postsPerPage;
  const offset = (Math.max(1, page) - 1) * limit;
  const from = `FROM posts p JOIN post_translations t ON t.post_id = p.id
                LEFT JOIN categories c ON c.id = p.category_id WHERE ${PUBLIC} ${where}`;
  const total = db.prepare(`SELECT COUNT(*) AS n ${from}`).get(params).n;
  const rows = db
    .prepare(`${SELECT} WHERE ${PUBLIC} ${where} ORDER BY p.published_at DESC LIMIT ${limit} OFFSET ${offset}`)
    .all(params);
  return { rows, total, page: Math.max(1, page), pages: Math.max(1, Math.ceil(total / limit)) };
}

const q = {
  latest(lang, page = 1) {
    return paged('', { lang }, page);
  },
  recent(lang, limit, offset = 0) {
    return db
      .prepare(`${SELECT} WHERE ${PUBLIC} ORDER BY p.published_at DESC LIMIT ${limit} OFFSET ${offset}`)
      .all({ lang });
  },
  popular(lang, limit) {
    return db
      .prepare(`${SELECT} WHERE ${PUBLIC} ORDER BY p.views DESC, p.published_at DESC LIMIT ${limit}`)
      .all({ lang });
  },
  byCategory(lang, slug, page = 1) {
    return paged('AND c.slug = @slug', { lang, slug }, page);
  },
  byTag(lang, slug, page = 1) {
    return paged(
      'AND p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags g ON g.id = pt.tag_id WHERE g.slug = @slug)',
      { lang, slug },
      page
    );
  },
  search(lang, term, page = 1) {
    const like = `%${escapeLike(term)}%`;
    return paged(
      `AND (t.title LIKE @like ESCAPE '\\' OR t.excerpt LIKE @like ESCAPE '\\' OR t.body LIKE @like ESCAPE '\\')`,
      { lang, like },
      page
    );
  },
  post(lang, slug) {
    return db
      .prepare(`${SELECT} WHERE ${PUBLIC} AND t.slug = @slug`)
      .get({ lang, slug });
  },
  // slug of the same post in another language, if translated and public
  translationSlug(postId, lang) {
    const row = db
      .prepare(
        `SELECT t.slug FROM posts p JOIN post_translations t ON t.post_id = p.id
         WHERE p.id = @id AND ${PUBLIC}`
      )
      .get({ id: postId, lang });
    return row ? row.slug : null;
  },
  postTags(postId, lang) {
    return db
      .prepare(
        `SELECT g.slug, CASE @lang WHEN 'sw' THEN g.name_sw ELSE g.name_en END AS name
         FROM post_tags pt JOIN tags g ON g.id = pt.tag_id WHERE pt.post_id = @id ORDER BY name`
      )
      .all({ id: postId, lang });
  },
  categories(lang) {
    return db
      .prepare(
        `SELECT c.slug,
                CASE @lang WHEN 'sw' THEN c.name_sw ELSE c.name_en END AS name,
                CASE @lang WHEN 'sw' THEN c.desc_sw ELSE c.desc_en END AS description
         FROM categories c ORDER BY c.id`
      )
      .all({ lang });
  },
  category(lang, slug) {
    return db
      .prepare(
        `SELECT slug, CASE @lang WHEN 'sw' THEN name_sw ELSE name_en END AS name,
                CASE @lang WHEN 'sw' THEN desc_sw ELSE desc_en END AS description
         FROM categories WHERE slug = @slug`
      )
      .get({ lang, slug });
  },
  tag(lang, slug) {
    return db
      .prepare(
        `SELECT slug, CASE @lang WHEN 'sw' THEN name_sw ELSE name_en END AS name FROM tags WHERE slug = @slug`
      )
      .get({ lang, slug });
  },
  incrementViews(postId) {
    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(postId);
  },
  addSubscriber(email, lang) {
    return db
      .prepare('INSERT OR IGNORE INTO subscribers (email, lang) VALUES (?, ?)')
      .run(email, lang).changes;
  },
};

module.exports = q;
