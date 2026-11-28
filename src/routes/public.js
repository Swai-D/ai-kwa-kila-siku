const express = require('express');
const config = require('../config');
const q = require('../queries');
const { translate, formatDate, readingMinutes } = require('../i18n');
const settings = require('../settings');

const router = express.Router({ mergeParams: true });

const other = (lang) => (lang === 'sw' ? 'en' : 'sw');

function setCommon(req, res, lang) {
  const t = (key) => settings.textOverride(lang, key) || translate(lang, key);
  res.cookie('lang', lang, { maxAge: 365 * 24 * 3600 * 1000, sameSite: 'lax', httpOnly: true });
  Object.assign(res.locals, {
    lang,
    otherLang: other(lang),
    site: settings.site(),
    siteUrl: config.siteUrl,
    t,
    fmtDate: (iso) => formatDate(lang, iso),
    isoDate: (iso) => iso.slice(0, 10),
    readingMinutes,
    categories: q.categories(lang),
    sidebar: { mini: q.recent(lang, 4), popular: q.popular(lang, 5) },
    // path of the current page in each language; null = no equivalent page
    altPaths: { sw: `/sw${req.path === '/' ? '/' : req.path}`, en: `/en${req.path === '/' ? '/' : req.path}` },
    canonicalPath: `/${lang}${req.path === '/' ? '/' : req.path}`,
    pageTitle: null,
    metaDescription: t('tagline'),
    bodyClass: '',
    withSidebar: true,
    ogImage: null,
    jsonLd: null,
    ogType: 'website',
    flash: req.query.sub || null,
  });
}

// Unknown first path segment (not sw/en): fall through to the 404 handler.
router.use((req, res, next) => {
  const lang = req.params.lang;
  if (!config.languages.includes(lang)) return next('router');
  setCommon(req, res, lang);
  next();
});

function pageNumber(req) {
  const n = parseInt(req.query.page, 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

function pageUrl(basePath, extra = {}) {
  return (n) => {
    const params = new URLSearchParams({ ...extra, ...(n > 1 ? { page: n } : {}) }).toString();
    return `${basePath}${params ? '?' + params : ''}`;
  };
}

router.get('/', (req, res) => {
  const result = q.latest(req.params.lang, pageNumber(req));
  res.render('home', { result, pageUrl: pageUrl(`/${req.params.lang}/`) });
});

router.get('/post/:slug', (req, res) => {
  const lang = req.params.lang;
  const post = q.post(lang, req.params.slug);
  if (!post) return renderNotFound(req, res, lang);

  q.incrementViews(post.id);
  const otherSlug = q.translationSlug(post.id, other(lang));
  res.locals.altPaths = {
    [lang]: `/${lang}/post/${post.slug}`,
    [other(lang)]: otherSlug ? `/${other(lang)}/post/${otherSlug}` : null,
  };
  res.render('post', {
    post,
    tags: q.postTags(post.id, lang),
    pageTitle: post.title,
    metaDescription: post.excerpt || res.locals.t('tagline'),
    canonicalPath: `/${lang}/post/${post.slug}`,
    ogImage: post.cover_image,
    ogType: 'article',
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt || undefined,
      inLanguage: lang,
      datePublished: `${post.published_at.replace(' ', 'T')}Z`,
      dateModified: `${post.updated_at.replace(' ', 'T')}Z`,
      mainEntityOfPage: `${config.siteUrl}/${lang}/post/${post.slug}`,
      image: post.cover_image ? [config.siteUrl + post.cover_image] : undefined,
      author: { '@type': 'Person', name: res.locals.site.authorName },
      publisher: { '@type': 'Organization', name: res.locals.site.name },
    }).replace(/</g, '\\u003c'),
    bodyClass: 'single',
    withSidebar: false,
  });
});

router.get('/category/:slug', (req, res) => {
  const lang = req.params.lang;
  const category = q.category(lang, req.params.slug);
  if (!category) return renderNotFound(req, res, lang);
  const result = q.byCategory(lang, category.slug, pageNumber(req));
  res.render('list', {
    heading: `${translate(lang, 'list.category')}: ${category.name}`,
    subheading: category.description,
    pageTitle: category.name,
    result,
    pageUrl: pageUrl(`/${lang}/category/${category.slug}`),
  });
});

router.get('/tag/:slug', (req, res) => {
  const lang = req.params.lang;
  const tag = q.tag(lang, req.params.slug);
  if (!tag) return renderNotFound(req, res, lang);
  const result = q.byTag(lang, tag.slug, pageNumber(req));
  res.render('list', {
    heading: `${translate(lang, 'list.tag')}: ${tag.name}`,
    subheading: '',
    pageTitle: tag.name,
    result,
    pageUrl: pageUrl(`/${lang}/tag/${tag.slug}`),
  });
});

router.get('/search', (req, res) => {
  const lang = req.params.lang;
  const term = String(req.query.q || '').trim().slice(0, 100);
  const result = term ? q.search(lang, term, pageNumber(req)) : { rows: [], total: 0, page: 1, pages: 1 };
  res.render('list', {
    heading: term ? `${translate(lang, 'search.results_for')} “${term}”` : translate(lang, 'search.title'),
    subheading: '',
    pageTitle: translate(lang, 'search.title'),
    emptyKey: 'search.empty',
    result,
    pageUrl: pageUrl(`/${lang}/search`, { q: term }),
    noindex: true,
  });
});

router.get('/about', (req, res) => {
  res.render('about', { pageTitle: res.locals.t('about.title') });
});

// Newsletter signup: honeypot field + 5 signups per hour per IP.
const signups = new Map();
function tooManySignups(ip) {
  const now = Date.now();
  const hits = (signups.get(ip) || []).filter((t) => now - t < 3600 * 1000);
  hits.push(now);
  signups.set(ip, hits);
  if (signups.size > 5000) signups.clear();
  return hits.length > 5;
}

router.post('/subscribe', (req, res) => {
  const lang = req.params.lang;
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Bots fill the hidden "website" field: answer "ok" and store nothing.
  if (req.body.website) return res.redirect(303, `/${lang}/?sub=ok#subscribe`);
  if (valid && tooManySignups(req.ip)) return res.redirect(303, `/${lang}/?sub=slow#subscribe`);
  if (valid) q.addSubscriber(email, lang);
  res.redirect(303, `/${lang}/?sub=${valid ? 'ok' : 'invalid'}#subscribe`);
});

// --- RSS feed ----------------------------------------------------------------
const xmlEsc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const absolutize = (html) => html.replace(/(src|href)="\/(?!\/)/g, `$1="${config.siteUrl}/`);
const rfc822 = (sql) => new Date(sql.replace(' ', 'T') + 'Z').toUTCString();

router.get('/rss.xml', (req, res) => {
  const lang = req.params.lang;
  const posts = q.recent(lang, 20);
  const feedUrl = `${config.siteUrl}/${lang}/rss.xml`;
  const items = posts
    .map((p) => {
      const link = `${config.siteUrl}/${lang}/post/${p.slug}`;
      const body = absolutize(p.body).replace(/]]>/g, ']]]]><![CDATA[>');
      return `    <item>
      <title>${xmlEsc(p.title)}</title>
      <link>${xmlEsc(link)}</link>
      <guid isPermaLink="true">${xmlEsc(link)}</guid>
      <pubDate>${rfc822(p.published_at)}</pubDate>
      ${p.category_name ? `<category>${xmlEsc(p.category_name)}</category>` : ''}
      <description>${xmlEsc(p.excerpt)}</description>
      <content:encoded><![CDATA[${body}]]></content:encoded>
    </item>`;
    })
    .join('\n');
  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEsc(res.locals.site.name)}</title>
    <link>${xmlEsc(`${config.siteUrl}/${lang}/`)}</link>
    <description>${xmlEsc(res.locals.t('tagline'))}</description>
    <language>${lang}</language>
    <atom:link href="${xmlEsc(feedUrl)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`);
});

function renderNotFound(req, res, lang) {
  if (!res.locals.t) setCommon(req, res, lang);
  res.locals.altPaths = { sw: '/sw/', en: '/en/' };
  res.locals.canonicalPath = `/${lang}/`;
  res.status(404).render('404', { pageTitle: translate(lang, 'error.404_title'), noindex: true });
}

module.exports = router;
module.exports.renderNotFound = renderNotFound;
