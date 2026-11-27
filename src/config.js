require('dotenv').config({ quiet: true });
const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  dbPath: path.resolve(process.env.DB_PATH || 'data/blog.db'),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  languages: ['sw', 'en'],
  defaultLang: 'sw',
  postsPerPage: 5,
  // Moves to the admin settings page in a later phase.
  site: {
    name: 'A.I Kwa Kila Siku',
    authorName: 'Davy Swai',
    authorAvatar: '/images/avatar.jpg',
    logo: '/images/logo.jpg',
    social: {
      twitter: '#',
      facebook: '#',
      instagram: '#',
      email: 'mailto:hello@example.com',
    },
  },
};
