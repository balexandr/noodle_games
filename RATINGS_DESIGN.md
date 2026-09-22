# Ratings & Ranking — Design Doc

Started 2026-09-22. Goal: let visitors star-rate each game on the hub so
everyone can see which games are actually most loved, and sort the grid by
that. Confirmed with user during scoping:

- Real cross-visitor ratings, not just a personal localStorage tally (the
  whole point is "people know which ones are most favorite").
- Backend: free hosted DB (Supabase), not a manual/synced JSON file.
- Scope: **hub only**. No changes to the 10 individual game repos or their
  shared footer. Rating happens on the noodlegames.co game cards, not
  inside a played game. Smaller blast radius, one repo touched.

This is infra new to the whole suite (nothing in NoodleGames talks to a
network service today, every game is pure static + localStorage), so
worth writing down before Realm/Mirror's disk-history problem repeats.

## Why Supabase over Firebase/Upstash

Ratings need "average + count per game" aggregation and "one rating per
visitor, update it if they re-rate" (upsert on a composite key). That's a
natural fit for Postgres (a `group by` view, a primary key constraint) and
Supabase's JS client talks to it directly from a static site with no
server of our own. Upstash Redis (already used in the unrelated `lightbulb`
repo) would work but pushes the aggregation logic into hand-rolled
INCR/HINCRBY math instead of one SQL view — more code for the same result.

## Data model (Supabase / Postgres)

```sql
create table game_ratings (
  game_id text not null,
  device_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_id, device_id)
);

alter table game_ratings enable row level security;

create policy "anyone can read ratings" on game_ratings
  for select using (true);

create policy "anyone can insert a rating" on game_ratings
  for insert with check (true);

create policy "anyone can update a rating" on game_ratings
  for update using (true);

-- RLS only filters rows a role is already allowed to touch — it's not a
-- substitute for the base table grant. Without this, anon gets 42501
-- "permission denied for table game_ratings" even though the policies
-- above say true. Needed because this project has "automatically expose
-- new tables" turned off (recommended, see the setup section below).
grant select, insert, update on game_ratings to anon, authenticated;

create view game_rating_stats as
select
  game_id,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*)::int as rating_count
from game_ratings
group by game_id;

grant select on game_rating_stats to anon;
```

**Accepted limitation, same trust model as the rest of the suite:** there's
no auth anywhere in NoodleGames (no accounts on any game), so `device_id`
is a client-generated UUID in localStorage, not a verified identity. RLS
here can't actually enforce "only the owning device can update its own
row" without real auth — the policies above are permissive by necessity.
This means a motivated bad actor could script spam edits to any row. Same
stakes as someone spamming a Google Form: acceptable for a casual free
puzzle site with no accounts, not acceptable if this table ever needs to
carry anything sensitive.

## Client

- `device_id`: generated once with `crypto.randomUUID()`, stored at
  localStorage key `noodle-device-id`. Reused on every future visit so a
  re-rate is an update, not a duplicate row (matches the fingerprint-guard
  pattern already used for Mirror/Realm's own localStorage saves).
- New `src/lib/supabase.js`: creates the client from
  `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- New `src/hooks/useGameRatings.js`: on mount, fetches all rows from
  `game_rating_stats` (avg + count per game) and the visitor's own rows
  from `game_ratings` (so their own stars show as filled-in immediately).
  Exposes `submitRating(gameId, rating)` which upserts
  `{ game_id, device_id, rating }` on conflict `(game_id, device_id)`, then
  refetches just that game's stats row.
- New `src/components/RatingStars.jsx` (+ `.css`): 5-star control. Shows
  the live average (e.g. "4.3 (12)") when not hovered/focused, shows the
  visitor's own pending selection on hover, fills in their submitted
  rating after they click. Renders nothing until stats have loaded (no
  layout jump from a skeleton).

## GameCard changes

Today the *entire* card (icon, title, desc, tags) is one `<a>` — clicking
anywhere opens the game in a new tab. A star button can't live inside that
`<a>` without accidentally navigating on every rating click. Fix:
restructure so `.game-card` (the outer bordered box, hover-lift, etc.) is
no longer itself the anchor — the `<a>` moves to wrap only the existing
icon/title/desc/tags block (renamed `.game-card__link`), and
`<RatingStars>` renders as a sibling below it, inside the same outer box
but outside the `<a>`. The hover-lift/border-glow effect moves from
`.game-card-link:hover` to `.game-card:hover` so hovering the ratings row
still lifts the whole card. Inactive ("soon") cards get no rating widget.

## Home page: ranking

Games grid gets a small sort control: **Newest** (today's `games.js`
order, unchanged default) vs **Top Rated** (sorts by avg_rating desc,
games with 0 ratings sort last, ties break by rating_count desc). Fetches
once at the `Home` level via `useGameRatings()` and passes each game's
stats down to its `GameCard`, rather than every card fetching
independently.

## Setup (manual, one-time, on the user)

Signing up for a third-party service isn't something to script — the user
creates the account and hands back two values:

1. Create a free Supabase project.
2. Run the SQL above in its SQL editor.
3. Copy the project URL and the `anon` public key (safe to ship
   client-side, that's what RLS is for) into `noodle_games/.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. `.env` stays gitignored; `.env.example` documents the two keys.

## Explicitly out of scope for this pass

- Rating prompts inside individual games (the "hub + inside each game"
  option was scoped out to avoid touching all 11 repos).
- Weighting/Bayesian-average tricks for low-vote-count games beyond the
  simple "0 ratings sort last" rule above.
- Abuse prevention beyond RLS (rate limiting, CAPTCHA) — not worth it at
  this traffic/stakes level, revisit if it's ever actually abused.
