// Site settings editable from the admin. Stored as key/value rows; defaults live here.
const db = require('./db');
const config = require('./config');

const DEFAULTS = {
  site_name: config.site.name,
  author_name: config.site.authorName,
  author_avatar: config.site.authorAvatar,
  logo: config.site.logo,
  tagline_sw: '',
  tagline_en: '',
  about_sw: '',
  about_en: '',
  about_page_sw: '',
  about_page_en: '',
  social_twitter: '',
  social_facebook: '',
  social_instagram: '',
  social_email: '',
};

let cache = null;

function all() {
  if (!cache) {
    cache = { ...DEFAULTS };
    for (const row of db.prepare('SELECT key, value FROM settings').all()) {
      if (row.key in DEFAULTS) cache[row.key] = row.value;
    }
  }
  return cache;
}

function save(values) {
  const up = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  db.transaction(() => {
    for (const key of Object.keys(DEFAULTS)) if (key in values) up.run(key, String(values[key]));
  })();
  cache = null;
}

// Shape used by the views.
function site() {
  const s = all();
  return {
    name: s.site_name,
    authorName: s.author_name,
    authorAvatar: s.author_avatar || DEFAULTS.author_avatar,
    logo: s.logo || DEFAULTS.logo,
    social: {
      twitter: s.social_twitter,
      facebook: s.social_facebook,
      instagram: s.social_instagram,
      email: s.social_email ? `mailto:${s.social_email}` : '',
    },
  };
}

// Admin-written replacement for a built-in UI text, or null to fall back to locales/*.json.
function textOverride(lang, key) {
  const map = { tagline: 'tagline', 'sidebar.about_text': 'about', 'about.body': 'about_page' };
  if (!map[key]) return null;
  return all()[`${map[key]}_${lang}`] || null;
}

module.exports = { DEFAULTS, all, save, site, textOverride };
