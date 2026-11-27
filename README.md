# A.I Kwa Kila Siku

A bilingual (Swahili / English) AI blog with a built-in admin dashboard for writing, scheduling and managing posts.

**Stack:** Node.js, Express 5, EJS, SQLite (better-sqlite3).

## Run locally

```bash
npm install
cp .env.example .env
npm run seed     # optional: sample bilingual posts
npm run create-admin -- you@example.com "Your Name"   # prompts for a password (min 10 chars)
npm run dev      # blog: http://localhost:3000   admin: http://localhost:3000/admin
```

## How it works

- **Languages:** every public page lives under `/sw/...` or `/en/...`. `/` redirects to the visitor's saved choice (cookie), else their browser language, else Swahili. The `SW`/`EN` button in the header jumps to the same page in the other language (the post's translated slug if one exists). `hreflang` tags link both versions for search engines.
- **UI text:** `locales/sw.json` and `locales/en.json`.
- **Posts:** one `posts` row plus a `post_translations` row per language (own slug, title, excerpt, body). A post is public only when `status = 'published'`, `published_at` is in the past (UTC, format `YYYY-MM-DD HH:MM:SS`) and a translation exists for the requested language. A future `published_at` means the post is scheduled.
- **Views:** `views/` (EJS), styled with the Future Imperfect template in `public/assets`.

## Admin dashboard (`/admin`)

Built on the Dason theme (`public/admin-assets`). English interface.

- **Login:** email + password (scrypt hashes), 14-day server-side sessions in an HttpOnly cookie, login throttle (8 failures / 15 min / IP), same-origin check plus a per-session CSRF token on every POST.
- **Posts:** list (search, sort), create, edit, delete. Swahili and English side by side in tabs, each with its own title, link slug, summary and article (CKEditor). Leave a language's title empty and that version is not published.
- **Publishing:** status Draft / Published. A Published post with a future time is *Scheduled* and goes live by itself. Times are entered in Dar es Salaam time and stored in UTC.
- **Images:** cover image and in-article images upload to `UPLOAD_DIR` (default `uploads/`, served at `/uploads`). JPG, PNG, WebP, GIF only, 5 MB max.
- **Safety:** article HTML is sanitised on save (scripts, event handlers and `javascript:` links are removed).

## Deploying

Set `SITE_URL` to your real `https://` address (enables HSTS and secure cookies), keep `data/` and `uploads/` on persistent storage and back them up.

## Roadmap

1. Foundation and public blog (done)
2. Admin dashboard: login, post CRUD with bilingual editor (done)
3. Categories and tags management, media library, settings
4. Newsletter export, RSS, sitemap, SEO
5. Scheduling polish, deploy notes

## Credits

Public theme: [Future Imperfect](https://html5up.net/future-imperfect) by HTML5 UP, CCA 3.0 (`docs/credits/`). Demo images from Unsplash (CC0).
