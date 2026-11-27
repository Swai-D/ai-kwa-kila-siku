const fs = require('fs');
const path = require('path');
const config = require('./config');

const dictionaries = {};
for (const lang of config.languages) {
  dictionaries[lang] = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'locales', `${lang}.json`), 'utf8')
  );
}

function translate(lang, key) {
  return dictionaries[lang][key] ?? dictionaries[config.defaultLang][key] ?? key;
}

function formatDate(lang, iso) {
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'));
  return new Intl.DateTimeFormat(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Dar_es_Salaam',
  }).format(d);
}

// Words per minute for reading time. Plain HTML tags are stripped first.
function readingMinutes(html) {
  const words = String(html).replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function pickFromAcceptLanguage(header) {
  if (!header) return config.defaultLang;
  const first = header.split(',').map((s) => s.trim().slice(0, 2).toLowerCase());
  return first.find((l) => config.languages.includes(l)) || config.defaultLang;
}

module.exports = { translate, formatDate, readingMinutes, pickFromAcceptLanguage };
