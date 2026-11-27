const sanitizeHtml = require('sanitize-html');

const EAT_OFFSET_MS = 3 * 3600 * 1000; // Africa/Dar_es_Salaam is UTC+3 with no daylight saving

function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' na ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

const pad = (n) => String(n).padStart(2, '0');
const toSql = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

const nowSql = () => toSql(new Date());

// <input type="datetime-local"> value, entered in Dar es Salaam time -> UTC "YYYY-MM-DD HH:MM:SS"
function eatInputToUtc(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - EAT_OFFSET_MS;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : toSql(d);
}

// UTC "YYYY-MM-DD HH:MM:SS" -> datetime-local value in Dar es Salaam time
function utcToEatInput(sql) {
  if (!sql) return '';
  const d = new Date(new Date(sql.replace(' ', 'T') + 'Z').getTime() + EAT_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function formatEat(sql) {
  if (!sql) return '—';
  return utcToEatInput(sql).replace('T', ' ');
}

function cleanHtml(dirty) {
  return sanitizeHtml(String(dirty || ''), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img', 'figure', 'figcaption', 's', 'u']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      figure: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      ol: ['start'],
    },
    allowedClasses: { figure: ['image', 'table', 'image-style-side', 'image_resized'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: (tag, attribs) => ({
        tagName: 'a',
        attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
      }),
    },
  });
}

module.exports = { slugify, nowSql, eatInputToUtc, utcToEatInput, formatEat, cleanHtml };
