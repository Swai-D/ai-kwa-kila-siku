const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./config');
const publicRoutes = require('./routes/public');
const { pickFromAcceptLanguage } = require('./i18n');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        formAction: ["'self'"],
        frameSrc: ["'self'", 'https://www.youtube.com'],
      },
    },
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '7d' }));

// "/" -> the visitor's language: saved choice, else browser language, else Swahili.
app.get('/', (req, res) => {
  const saved = req.cookies.lang;
  const lang = config.languages.includes(saved)
    ? saved
    : pickFromAcceptLanguage(req.headers['accept-language']);
  res.redirect(302, `/${lang}/`);
});

app.use('/:lang', publicRoutes);

app.use((req, res) => {
  const lang = config.languages.includes(req.cookies.lang) ? req.cookies.lang : config.defaultLang;
  res.status(404);
  publicRoutes.renderNotFound(req, res, lang);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text').send('Server error');
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`A.I Kwa Kila Siku running on ${config.siteUrl} (port ${config.port})`);
  });
}

module.exports = app;
