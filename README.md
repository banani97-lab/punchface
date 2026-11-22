# punchface

Free, ad-free party invitations. A host makes an invite in a couple of minutes and shares one link; guests reply in a tap with no app and no account.

## What's in it

**For guests**
- One-tap reply (going / maybe / can't), plus-ones and a note. A name is all it takes.
- Add to Apple, Google or Outlook calendar; one-tap maps link.
- Date polls, a bring list to claim items from, a wall with comments and reactions, and a shared photo album.
- Optional email for a confirmation and a personal link to change the reply from any device.

**For hosts**
- Editor with 15 generated, animated themes (or your own cover photo), a live preview, and a draft that survives a refresh.
- Invite writer: describe the party in a sentence and get a title, description, emoji, theme and bring list.
- Dashboard: headcount, guest list with filters, manual add, CSV export, share link and QR code.
- Email invites with personal links, nudges for non-repliers, updates to all guests, automatic reminders.
- Headcount limit with a waitlist that promotes automatically when a seat frees up.
- No account needed to start. Adding an email later (one-time link, no password) moves everything on the device into the account.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No setup: the SQLite database is created and migrated on first boot, and emails land in the dev outbox at `/dev/outbox` until a provider is configured.

```bash
npm run typecheck  # route types + tsc
npm run lint
npm test           # unit tests, including a WCAG contrast check of every theme
npm run build && npm start
```

## Configuration

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Public origin. **Required in production**: emailed links are built from it. |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | Defaults to `./data/punchface.db`. Set to a libSQL/Turso URL to use a hosted database. |
| `PUNCHFACE_DATA_DIR` | Folder for the SQLite file and uploaded images (default `./data`). |
| `RESEND_API_KEY`, `EMAIL_FROM` | Turns on real email delivery. Without it, emails are only recorded. |
| `ANTHROPIC_API_KEY` | Turns on the AI invite writer. Without it, a keyword-based template fallback is used. |
| `CRON_SECRET` | Enables `POST /api/cron/reminders` (send `Authorization: Bearer <secret>`, hourly). |

## How it's built

- **Next.js 16** (App Router, Cache Components, Server Actions), **React 19**, **TypeScript**.
- **Tailwind CSS 4** with a small token layer in `src/app/globals.css`. Every component reads the same semantic variables (`--bg`, `--fg`, `--card`, `--accent`, ...); an event page re-declares them from its theme, so one set of components renders all 15 themes.
- **Drizzle ORM** on **libSQL/SQLite**. Schema in `src/db/schema.ts`, migrations in `drizzle/` (`npm run db:generate` after changing the schema).
- No UI kit: sheets use the native `<dialog>`, cover art is generated SVG, fonts are self-hosted variable fonts.

```
src/app/(app)/        brand-chrome pages: landing, /new, /events, /login, host dashboard, editor
src/app/e/[slug]/     the public invite page (themed), calendar file, CSV export, link-preview image
src/app/i/[token]/    personal invite links
src/app/api/          uploads and the reminders cron endpoint
src/actions/          Server Actions (events, replies, guests, wall, sign-in, invite writer)
src/lib/              data access, sessions, email, storage, themes, time, validation
src/components/       cover art, event sections, editor, dashboard, UI primitives
```

### Things worth knowing

- **Identity.** Anyone who creates or answers an invite gets a device-only account behind an httpOnly session cookie. Signing in with an email upgrades or merges it. Sessions and sign-in tokens are stored hashed.
- **Authorization** lives in `src/lib/access.ts` and is re-checked inside every Server Action and Route Handler.
- **Privacy.** The guest list, guest comments and photos follow the host's visibility setting. Guest emails and notes are only ever sent to the host. Uploaded photos are re-encoded, which strips EXIF data including GPS position. Invite pages are `noindex`.
- **Storage** is behind `src/lib/storage.ts` (local disk today); email is behind `src/lib/email.ts`. Swapping either is a one-file change.

### Before going to production

- Set `APP_URL`, an email provider and `CRON_SECRET`, and schedule the reminders endpoint.
- Uploads and the default database live on local disk: use a host with a persistent volume, or move the database to Turso and `storage.ts` to object storage.
- Rate limiting is in-memory (per process). Put a shared store behind `allow()` in `src/lib/request.ts` before running more than one instance.
