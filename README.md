# A.I Kwa Kila Siku

A bilingual (Swahili / English) AI blog with a built-in admin dashboard for writing, scheduling and managing posts.

**Stack:** Node.js, Express 5, EJS, SQLite (better-sqlite3).

## Run locally

```bash
npm install
cp .env.example .env
npm run seed     # optional: sample bilingual posts
npm run dev      # http://localhost:3000
```

## How it works

- **Languages:** every public page lives under `/sw/...` or `/en/...`. `/` redirects to the visitor's saved choice (cookie), else their browser language, else Swahili. The `SW`/`EN` button in the header jumps to the same page in the other language (the post's translated slug if one exists). `hreflang` tags link both versions for search engines.
- **UI text:** `locales/sw.json` and `locales/en.json`.
- **Posts:** one `posts` row plus a `post_translations` row per language (own slug, title, excerpt, body). A post is public only when `status = 'published'`, `published_at` is in the past (UTC, format `YYYY-MM-DD HH:MM:SS`) and a translation exists for the requested language. A future `published_at` means the post is scheduled.
- **Views:** `views/` (EJS), styled with the Future Imperfect template in `public/assets`.

## Roadmap

1. Foundation and public blog (this phase)
2. Admin dashboard (Dason template): login, post CRUD with editor
3. Categories, tags, media uploads, dashboard stats
4. Newsletter export, RSS, sitemap, SEO
5. Scheduling polish, deploy notes

## Credits

Public theme: [Future Imperfect](https://html5up.net/future-imperfect) by HTML5 UP, CCA 3.0 (`docs/credits/`). Demo images from Unsplash (CC0).
