# MatchTalk

Anonymous, event-pinned live chat. No login — pick an event (a match, currently World Cup games), drop your take, get a random nickname. Built with Next.js (App Router) + Prisma + PostgreSQL.

## How it works

- **Event** = a match/topic with a status: `live`, `upcoming`, or `ended`. You control these by adding rows (see Seeding below) — there's no admin UI yet, on purpose, to keep this simple.
- **Message** = an anonymous post tied to one event. First time someone posts in a browser, they get a random nickname (e.g. "Sneaky Penguin23") that's remembered in `localStorage` so it stays consistent across their messages in that browser.
- **Live updates** = the chat room polls every 3 seconds for new messages. No websockets, no extra infra — simple and reliable, and fine for this kind of chat volume.
- **Spam control** = a basic per-IP rate limit (1 message per 3 seconds) and a 500-character cap. It's in-memory, so it resets on server restart — good enough for v1, swap for Redis if you scale to multiple server instances.

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and point `DATABASE_URL` at a Postgres database (a free one from [Neon](https://neon.tech) or [Railway](https://railway.app) works well, or run Postgres locally/in Docker).
3. Push the schema to your database:
   ```
   npx prisma db push
   ```
4. Seed a few sample events:
   ```
   npm run seed
   ```
5. Run the dev server:
   ```
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Adding/updating events

For now, manage events directly: either edit `prisma/seed.js` and re-run `npm run seed`, or open Prisma Studio for a quick UI:
```
npx prisma studio
```
There you can add new matches, and flip `status` between `upcoming` → `live` → `ended` as the day goes (e.g. switch a match to `live` right before kickoff, then `ended` after the final whistle).

## Deploying

This is built to deploy the same way as your other projects:

- **Vercel** for the Next.js app — just import the repo, set `DATABASE_URL` as an environment variable, and it'll build automatically (`prisma generate` runs as part of `npm install` via the `postinstall` hook — see note below).
- **Railway** or **Neon** for the Postgres database.

One extra step before deploying: add a `postinstall` script so Prisma generates its client during the Vercel build. Add this to `package.json`:
```json
"postinstall": "prisma generate"
```

## What's deliberately left out (v1 scope)

- No accounts, no auth, no DMs — it's a public anonymous feed by design.
- No moderation tooling beyond rate limiting and a character cap. If you open this up publicly, you'll want at minimum a basic word filter or a way to delete a message (a simple admin-only DELETE route would be a quick follow-up).
- No websockets — polling every 3s is simple and good enough for typical match-chat volume. If a single event gets thousands of concurrent posters, that's when websockets (e.g. via Pusher or a small Socket.io service) would start to pay off.

## Project structure

```
app/
  page.js                 → event list (home)
  event/[id]/page.js      → chat room for one event
  api/events/route.js     → GET list of events
  api/events/[id]/messages/route.js → GET/POST messages
lib/
  db.js                   → Prisma client
  nickname.js             → random nickname generator
prisma/
  schema.prisma           → Event + Message models
  seed.js                 → sample World Cup events
```
