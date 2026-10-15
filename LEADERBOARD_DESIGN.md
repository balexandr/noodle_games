# Leaderboards — Design Doc

Started 2026-10-12. Goal: a daily top-3 leaderboard inside each game
(arcade-style, type 3 initials if you make the cut) plus a per-game
"today's leader" card on the hub homepage. Confirmed with user during
scoping:

- Cutoff is top 3, not top 10 — these are low-traffic daily puzzles,
  a 10-slot board would rarely fill and a "top 3" bar reads as more
  exclusive/meaningful at this scale. Changed 2026-10-13 after the
  pilots shipped with 10; touches the `submit_score` RPC (two literal
  3s, see "Data model" below) and `wouldQualify` in `leaderboard.js`
  (see "Client" below) — no schema change, no re-seeding needed.
- The initials prompt auto-opens the moment a qualifying score is
  ready — it does not wait for the player to click "today's
  leaderboard" first. See "Client" below.

- Hub shows each game's own leaderboard leader, not one unified
  cross-game ranking. No new cross-subdomain identity needed as a
  result — see "Device identity" below.
- Pilot on two games first (Dial: time-based, Zero In: points-based)
  before touching the other 10.
- Writes go through a server-side RPC, not a raw table insert. This
  stops casual localStorage tampering and spam; it does not stop a
  determined attacker replaying a crafted network request, since none
  of these games have a server-authoritative game engine to check a
  score against. Same hard limit as any purely client-side game with a
  leaderboard. Documented so it's a known tradeoff, not a surprise.
- Must not hardcode "higher wins" or "lower wins" anywhere shared —
  different games mean different things by winning (seconds, points,
  attempts, stars, hints, and whatever a future game invents). See
  "Scoring abstraction" below.

## Scoring abstraction

The database and the RPC never interpret what a score *means*. Every
game reduces its own result to three values before submitting:

- `score` (numeric, required) — the one value sort order is based on.
- `tiebreak` (numeric, optional) — second sort key, for games where
  winning isn't one-dimensional (e.g. Mirror: stars first, then time).
- `score_display` (text, required) — whatever string the game wants
  shown on the board (`"01:23"`, `"1,450 pts"`, `"★★★ · 00:45"`). Never
  sorted on, purely cosmetic.

A `leaderboard_games` config row per game says which direction `score`
(and `tiebreak`, if used) sort in, plus bounds for the RPC to validate
against. Each game owns a small `toLeaderboardScore(result)` function
in its own `scoring.js` that does this conversion — the schema never
changes when a new game or a new way of winning shows up.

## Device identity

Reuses the exact pattern `noodle_games/src/lib/supabase.js` already
uses for ratings (`crypto.randomUUID()`, stored in localStorage) — but
scoped per-game (key `<gameId>-device-id`, in that game's own
localStorage), not hub-scoped. Since the leaderboard is per-game, a
device only needs a stable id *within that game*, across repeat plays,
so improving your own score updates your row instead of creating a
duplicate. No cross-subdomain cookie needed, unlike `shareAll.js`'s
"did I finish today" roster, which genuinely needs to be read from
every game's subdomain.

## Data model (Supabase / Postgres)

```sql
-- One row per game that has a leaderboard. Single source of truth for
-- "what does winning mean" — nothing else hardcodes a sort direction.
create table leaderboard_games (
  game_id text primary key,
  sort_direction text not null check (sort_direction in ('asc', 'desc')),
  tiebreak_direction text check (tiebreak_direction in ('asc', 'desc')),
  min_score numeric not null,
  max_score numeric not null
);

alter table leaderboard_games enable row level security;

create policy "anyone can read leaderboard game config" on leaderboard_games
  for select using (true);

grant select on leaderboard_games to anon;

-- Today's top 3 for one game. Self-capping: a row is only ever
-- inserted when fewer than 3 rows already beat it (see submit_score
-- below), so this table can never hold more than 3 rows per
-- (game_id, date) without needing a cleanup job.
create table leaderboard_scores (
  game_id text not null references leaderboard_games(game_id),
  date date not null,
  device_id uuid not null,
  initials text not null check (initials ~ '^[A-Z0-9]{2,3}$'), -- was {3} exactly, loosened 2026-10-15
  score numeric not null,
  tiebreak numeric,
  score_display text not null,
  created_at timestamptz not null default now(),
  primary key (game_id, date, device_id)
);

alter table leaderboard_scores enable row level security;

create policy "anyone can read leaderboard scores" on leaderboard_scores
  for select using (true);

-- Deliberately no insert/update policy for anon. All writes go
-- through submit_score() below, which runs as the table owner
-- (security definer) and bypasses RLS the same way a table owner
-- always does — anon gets execute on the function, nothing direct on
-- the table. Unlike game_ratings, a leaderboard is a much more
-- visible, gameable target than a star rating, worth the extra step.

grant select on leaderboard_scores to anon;

-- Small, expandable blocklist for 3-letter initials. Not grant-ed to
-- anon at all (not even select) — submit_score checks it internally;
-- a security definer function's internal queries run with the owner's
-- privileges regardless of the caller's own grants, so this works
-- without exposing the list itself to the client.
create table leaderboard_blocked_initials (
  word text primary key
);

insert into leaderboard_blocked_initials (word) values
  ('ASS'), ('FAG'), ('FUK'), ('FUC'), ('CUM'), ('CNT'), ('COC'),
  ('DIK'), ('DIC'), ('KKK'), ('KYS'), ('NIG'), ('PIS'), ('POO'),
  ('SEX'), ('SHT'), ('SOB'), ('TIT'), ('WOP'), ('XXX');
  -- starter list, not exhaustive — expand as needed, see "Explicitly
  -- out of scope" below. An earlier draft of this list wrongly
  -- included GAY and JEW (identity terms, not profanity — blocking
  -- them implies the identity itself is offensive, which is wrong)
  -- and PCP/PUS/RAC/RAP/TWA (too weak/ambiguous, more likely to catch
  -- someone's real initials than actual profanity). Caught and fixed
  -- before this went live anywhere.

-- The only way a score can ever be written. Validates everything the
-- client can't be trusted to validate itself, then only persists if
-- the score currently ranks in today's top 3 — evicting the current
-- worst row if the board is already full. See the comment above the
-- eviction step below for why that step exists; an earlier draft of
-- this function rejected a worse newcomer once N better rows existed
-- but never evicted anyone for a BETTER newcomer, so the table could
-- grow past the cutoff forever. Caught before this went live anywhere.
-- Cutoff itself changed from 10 to 3 on 2026-10-13 (see top of doc) —
-- just the two literal 3s below, nothing structural.
--
-- Also checks the caller's OWN existing score (if any) upfront: an
-- earlier draft skipped this and relied only on the ON CONFLICT ...
-- WHERE clause at the very end to silently no-op a non-improving
-- resubmission. That kept the DATA correct (nothing got overwritten
-- with a worse score) but the function still returned accepted=true
-- for it, since it never checked whether the write actually happened
-- — a client would wrongly tell the player they improved their rank.
-- Caught live by testing this exact case before it shipped anywhere.
create or replace function submit_score(
  p_game_id text,
  p_device_id uuid,
  p_score numeric,
  p_tiebreak numeric,
  p_score_display text,
  p_initials text
)
returns table (accepted boolean, rank int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game leaderboard_games%rowtype;
  v_date date;
  v_initials text;
  v_existing_score numeric;
  v_other_count int;
  v_better_count int;
begin
  select * into v_game from leaderboard_games where game_id = p_game_id;
  if not found then
    raise exception 'unknown game_id: %', p_game_id;
  end if;

  if p_score < v_game.min_score or p_score > v_game.max_score then
    raise exception 'score out of bounds for %: %', p_game_id, p_score;
  end if;

  if p_score_display is null or length(p_score_display) = 0
     or length(p_score_display) > 40 then
    raise exception 'invalid score_display';
  end if;

  v_initials := upper(regexp_replace(coalesce(p_initials, ''), '[^a-zA-Z0-9]', '', 'g'));
  -- 2 or 3, not exactly 3 (loosened 2026-10-15) — the blocklist below
  -- only has 3-letter entries, so a 2-letter input just never matches
  -- any of them; not worth a separate 2-letter list for this.
  if length(v_initials) not in (2, 3) then
    raise exception 'initials must be 2 or 3 letters/digits';
  end if;
  if exists (select 1 from leaderboard_blocked_initials where word = v_initials) then
    raise exception 'initials not allowed';
  end if;

  -- Matches the suite's existing daily-reset convention (America/New_York,
  -- DST-aware — see noodle_games README's EST->ET fix for precedent).
  v_date := (now() at time zone 'America/New_York')::date;

  select score into v_existing_score
  from leaderboard_scores
  where game_id = p_game_id and date = v_date and device_id = p_device_id;

  if v_existing_score is not null and not (
    case when v_game.sort_direction = 'asc' then p_score < v_existing_score
         else p_score > v_existing_score end
  ) then
    return query select false, null::int;
    return;
  end if;

  -- Rows for OTHER devices today (my own existing row, if any, is
  -- never competition for myself — on conflict below just updates it
  -- in place, so it can never push the total over the cutoff on its
  -- own).
  select count(*) into v_other_count
  from leaderboard_scores
  where game_id = p_game_id and date = v_date and device_id <> p_device_id;

  select count(*) into v_better_count
  from leaderboard_scores
  where game_id = p_game_id and date = v_date and device_id <> p_device_id
    and (case when v_game.sort_direction = 'asc' then score < p_score
              else score > p_score end);

  -- 3 others already beat this score outright — no room, full stop.
  if v_better_count >= 3 then
    return query select false, null::int;
    return;
  end if;

  -- Board already has 3 other rows and this score beats at least one
  -- of them (guaranteed by the check above) — evict the single worst
  -- of those 3 so the total stays at 3 after this insert, instead
  -- of growing to 4. The negate-for-desc trick turns "worst" into a
  -- plain "order by ... desc limit 1" regardless of this game's
  -- direction: for asc (lower wins) the highest raw score is worst;
  -- for desc (higher wins) the lowest raw score is worst, i.e. the
  -- highest negated score.
  if v_other_count >= 3 then
    delete from leaderboard_scores
    where ctid = (
      select ctid from leaderboard_scores
      where game_id = p_game_id and date = v_date and device_id <> p_device_id
      order by (case when v_game.sort_direction = 'asc' then score else -score end) desc
      limit 1
    );
  end if;

  insert into leaderboard_scores
    (game_id, date, device_id, initials, score, tiebreak, score_display)
  values
    (p_game_id, v_date, p_device_id, v_initials, p_score, p_tiebreak, p_score_display)
  on conflict (game_id, date, device_id) do update
    set score = excluded.score,
        tiebreak = excluded.tiebreak,
        score_display = excluded.score_display,
        initials = excluded.initials,
        created_at = now()
    where case when v_game.sort_direction = 'asc'
            then excluded.score < leaderboard_scores.score
            else excluded.score > leaderboard_scores.score end;

  return query select true, (v_better_count + 1);
end;
$$;

revoke all on function submit_score(text, uuid, numeric, numeric, text, text) from public;
grant execute on function submit_score(text, uuid, numeric, numeric, text, text) to anon;
```

**Accepted edge case:** exact ties don't count as "better" (strict `<`
/ `>`), so a pile of tied scores at the cutoff can let a table briefly
exceed 3 rows. Not worth the extra complexity of real rank-with-ties
logic for a casual daily board — if it ever actually happens enough to
notice, revisit then.

**Why this table stays capped at 3 rows without a cleanup job:** a
new entrant is only ever inserted when fewer than 3 OTHER rows beat
it, and if the board is already full (3 others), the single worst of
those 3 is evicted first — so the total can never exceed 3. No cron
job, no `delete where rank > 3` needed.

## Client

- No new tables or RPCs needed on the read side — the client fetches
  `leaderboard_games` (one row, cached) and `leaderboard_scores` for
  `(game_id, today)` (at most 3 rows), then sorts client-side using
  the fetched `sort_direction`/`tiebreak_direction`. Simpler than a
  second "sorted view" function in Postgres for 3 rows.
- Each pilot game gets its own `src/lib/supabase.js` (same shape as
  the hub's) and `.env` / `.env.example`, since leaderboard writes
  happen inside the game, not the hub. The anon key is safe to ship
  per-repo the same way it already is in the hub — RLS and the RPC are
  what actually gate access, not keeping the key secret.
- `src/utils/leaderboard.js` per game: `fetchTodayBoard(gameId)`,
  `wouldQualify(score, board)` (client-side pre-check, purely for UX —
  decides whether to show the initials prompt at all), `findMyRow`
  (skip re-prompting a device that's already on today's board), and
  `submitScore(gameId, { score, tiebreak, scoreDisplay, initials })`
  (calls the RPC, authoritative).
- End-of-game flow (**changed 2026-10-13**): the win effect itself —
  the same one that already calls `recordGame`/`recordTodayShare` —
  computes the score via that game's own `toLeaderboardScore()`,
  fetches today's board, and checks `wouldQualify` (and `!findMyRow`).
  If it qualifies, it sets `showLeaderboard = true` right there, so
  the initials prompt appears on its own the moment the win screen's
  reveal delay finishes — the player never has to click "today's
  leaderboard" to discover they made the cut. A non-qualifying win
  stays quiet; the leaderboard is still reachable via the header
  button and the win screen's own link, just not auto-opened. First
  draft of this feature only opened the panel on a manual click,
  which a live player reported losing the "congrats" moment to —
  fixed same day.

## Setup (manual, one-time, on the user)

Same reasoning as ratings — this needs the user's own Supabase project
access, not something to script blind.

1. Run the SQL above in the Supabase SQL editor (same project ratings
   already uses — same free project, just new tables/function, no new
   signup needed).
2. Seed `leaderboard_games` with the pilot rows once Dial and Zero
   In's scoring maps are finalized (next step, not done yet):
   ```sql
   insert into leaderboard_games (game_id, sort_direction, min_score, max_score) values
     ('dial', 'asc', 1, 3600),      -- elapsedSeconds, lower wins
     ('zero-in', 'desc', 0, 5);     -- 6 - clueNumber, higher wins
   ```
3. Each pilot game repo's `.env` gets the same `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` already in the hub's `.env` (not new
   values, just copied into the two game repos that need them).

## Explicitly out of scope for this pass

- Cross-game unified ranking (scoped out — per-game dashboard only).
- "My rank" display when a score doesn't make the top 3.
- Any moderation/admin view for submitted initials.
- Expanding the profanity blocklist beyond the starter list above.
- Rolling out past the two pilot games, until the pilot's been live
  and stable for a few days.

---

# All-Time Leaderboard (accounts) — Design Doc

Started 2026-10-13, after the daily top-3/top-10 board above was already
live suite-wide. A self-chosen recovery-code identity was mocked up and
rejected — "people won't remember a code" — in favor of real accounts.
Confirmed with user during scoping:

- Per-game, not cross-game (same reasoning as the daily board: fires vs.
  time vs. hints aren't comparable without a normalized point system,
  which is still explicitly out of scope).
- Google + GitHub sign-in only for now (Apple costs $99/yr and needs
  more setup — revisit if iOS players actually ask for it).
- **An account is required to submit to the all-time board at all** —
  this is the actual anti-spam mechanism (stops one person from
  flooding the board with fifty fake device identities). It is
  **not** an anti-cheat mechanism for score forgery itself: a client
  can still fabricate a plausible score and submit it as a real,
  signed-in account, same hard limit the daily board already accepted
  (no server-authoritative game engine to validate a score against).
  Documented here so it's a known tradeoff, not a surprise later.
- All-time board shows a **player-chosen display name**, tied to the
  account — not the 3-letter initials the daily board uses. Initials
  stay exactly as they are today, for players who never sign in.
- Top 10 cutoff (vs. the daily board's top 3) — reads as a rarer,
  bigger badge since it never resets.

## The cross-subdomain problem

Supabase Auth's default session storage is `localStorage`, which is
per-origin — a session on `mirror.noodlegames.co` would not be visible
on `knot.noodlegames.co`. Every game is its own subdomain, so signing
in separately on all 11 isn't acceptable.

**Fix: centralize the OAuth dance on the hub, share the result via a
cookie.** Exact same trick `leaderboard.js`'s `INITIALS_COOKIE` and
`shareAll.js`'s cross-subdomain roster already use — a cookie with
`Domain=.noodlegames.co` is readable from every subdomain, unlike
localStorage.

1. A game's "Sign in" button navigates to
   `https://noodlegames.co/login?return=<current game origin>`.
2. The hub runs Supabase's normal OAuth redirect flow
   (`supabase.auth.signInWithOAuth({ provider: 'google' | 'github' })`).
3. On return from the provider, the hub's own callback page has a live
   Supabase session (access token + refresh token). It writes both into
   one cookie (`noodle_session`, JSON, `Domain=.noodlegames.co`,
   `Secure`, `SameSite=Lax` — not `HttpOnly`, since the browser JS
   client needs to read it to rehydrate the session) and redirects back
   to `return`.
4. Each game's `src/lib/supabase.js` gets a tiny addition: a custom
   `storage` adapter passed to `createClient` that reads/writes that
   cookie instead of `localStorage`, so `supabase.auth.getSession()`
   on any subdomain picks up the session the hub wrote. Supabase's
   client already supports a custom storage object for exactly this
   kind of case — no fork of the library needed.
5. Only **one** redirect URI needs registering with Google and GitHub
   (`https://noodlegames.co/auth/callback`), not eleven.

Sign-out needs to clear the same cookie and should itself live on the
hub for the same reason sign-in does (one place that can see and clear
the `.noodlegames.co`-scoped cookie cleanly) — each game's "sign out"
button just navigates to `https://noodlegames.co/logout?return=<back>`.

**Accepted tradeoff, stated plainly:** the session (access + refresh
token) lives in a `.noodlegames.co`-scoped cookie readable by JS on
any of the 11 subdomains, because every one of them is a static site
with no backend of its own to hold it more privately (can't be
`HttpOnly` — the browser client needs to read it to rehydrate the
session). A stored-XSS bug on *any* one game could read this cookie
and act as that signed-in user suite-wide, which is a bigger blast
radius than today's device-id/initials cookie carries. The
alternative (routing every authenticated write through a hidden-iframe
postMessage bridge to the hub, so tokens never leave its origin) would
close that gap but is real added complexity for a free, low-traffic
puzzle suite that's already accepted client-side score forgery as a
hard limit elsewhere in this doc. Going with the simpler shared-cookie
approach; revisit only if this suite ever handles something more
sensitive than puzzle scores.

## Data model additions (Supabase / Postgres)

```sql
-- One row per signed-in player who's set a display name. Keyed by
-- Supabase's own auth.users id — no separate "accounts" table needed,
-- Supabase Auth already owns email/provider/identity.
create table player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint display_name_length check (char_length(display_name) between 3 and 20),
  constraint display_name_charset check (display_name ~ '^[A-Za-z0-9 _-]+$')
);

-- Case-insensitive uniqueness so "Player1" and "player1" can't both exist.
create unique index player_profiles_display_name_ci on player_profiles (lower(display_name));

alter table player_profiles enable row level security;

create policy "anyone can read display names" on player_profiles
  for select using (true);

grant select on player_profiles to anon, authenticated;

-- Same blocklist table the daily board already has, reused here —
-- checked as a substring match (a full display name has room to embed
-- a blocked word a 3-letter-exact-match initials check wouldn't
-- catch), not just an exact match.
create or replace function set_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;

  v_name := trim(p_display_name);
  if char_length(v_name) < 3 or char_length(v_name) > 20 then
    raise exception 'display name must be 3-20 characters';
  end if;
  if v_name !~ '^[A-Za-z0-9 _-]+$' then
    raise exception 'display name has invalid characters';
  end if;
  if exists (
    select 1 from leaderboard_blocked_initials b
    where position(lower(b.word) in lower(v_name)) > 0
  ) then
    raise exception 'display name not allowed';
  end if;

  insert into player_profiles (user_id, display_name)
  values (auth.uid(), v_name)
  on conflict (user_id) do update set display_name = excluded.display_name;
exception
  when unique_violation then
    raise exception 'that name is taken';
end;
$$;

revoke all on function set_display_name(text) from public;
grant execute on function set_display_name(text) to authenticated;

-- All-time equivalent of leaderboard_scores — no `date` column (it
-- never resets), keyed by (game_id, user_id) instead of
-- (game_id, date, device_id). display_name is denormalized onto the
-- row at submit time (same choice leaderboard_scores already made for
-- initials) rather than joined from player_profiles at read time —
-- simpler RLS, no join on every board fetch. A later name change only
-- shows up once the player next submits an improving score, same
-- staleness behavior the daily board already accepts for initials.
create table leaderboard_alltime_games (
  game_id text primary key references leaderboard_games(game_id),
  sort_direction text not null check (sort_direction in ('asc', 'desc')),
  tiebreak_direction text check (tiebreak_direction in ('asc', 'desc')),
  min_score numeric not null,
  max_score numeric not null
);

alter table leaderboard_alltime_games enable row level security;
create policy "anyone can read all-time game config" on leaderboard_alltime_games
  for select using (true);
grant select on leaderboard_alltime_games to anon;

create table leaderboard_alltime_scores (
  game_id text not null references leaderboard_alltime_games(game_id),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score numeric not null,
  tiebreak numeric,
  score_display text not null,
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table leaderboard_alltime_scores enable row level security;
create policy "anyone can read all-time scores" on leaderboard_alltime_scores
  for select using (true);
grant select on leaderboard_alltime_scores to anon;
-- No insert/update policy for anon or authenticated — same reasoning
-- as the daily board, all writes go through the RPC below.

-- Cutoff is 10, not 3 (see decision log above) — same eviction shape
-- as submit_score, just no `date` dimension and gated on auth.uid().
create or replace function submit_alltime_score(
  p_game_id text,
  p_score numeric,
  p_tiebreak numeric,
  p_score_display text
)
returns table (accepted boolean, rank int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game leaderboard_alltime_games%rowtype;
  v_display_name text;
  v_existing_score numeric;
  v_other_count int;
  v_better_count int;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to submit to the all-time board';
  end if;

  select display_name into v_display_name from player_profiles where user_id = auth.uid();
  if v_display_name is null then
    raise exception 'must set a display name before submitting';
  end if;

  select * into v_game from leaderboard_alltime_games where game_id = p_game_id;
  if not found then
    raise exception 'unknown game_id: %', p_game_id;
  end if;

  if p_score < v_game.min_score or p_score > v_game.max_score then
    raise exception 'score out of bounds for %: %', p_game_id, p_score;
  end if;

  select score into v_existing_score
  from leaderboard_alltime_scores
  where game_id = p_game_id and user_id = auth.uid();

  if v_existing_score is not null and not (
    case when v_game.sort_direction = 'asc' then p_score < v_existing_score
         else p_score > v_existing_score end
  ) then
    return query select false, null::int;
    return;
  end if;

  select count(*) into v_other_count
  from leaderboard_alltime_scores
  where game_id = p_game_id and user_id <> auth.uid();

  select count(*) into v_better_count
  from leaderboard_alltime_scores
  where game_id = p_game_id and user_id <> auth.uid()
    and (case when v_game.sort_direction = 'asc' then score < p_score
              else score > p_score end);

  if v_better_count >= 10 then
    return query select false, null::int;
    return;
  end if;

  if v_other_count >= 10 then
    delete from leaderboard_alltime_scores
    where ctid = (
      select ctid from leaderboard_alltime_scores
      where game_id = p_game_id and user_id <> auth.uid()
      order by (case when v_game.sort_direction = 'asc' then score else -score end) desc
      limit 1
    );
  end if;

  insert into leaderboard_alltime_scores
    (game_id, user_id, display_name, score, tiebreak, score_display)
  values
    (p_game_id, auth.uid(), v_display_name, p_score, p_tiebreak, p_score_display)
  on conflict (game_id, user_id) do update
    set score = excluded.score,
        tiebreak = excluded.tiebreak,
        score_display = excluded.score_display,
        display_name = excluded.display_name,
        updated_at = now()
    where case when v_game.sort_direction = 'asc'
            then excluded.score < leaderboard_alltime_scores.score
            else excluded.score > leaderboard_alltime_scores.score end;

  return query select true, (v_better_count + 1);
end;
$$;

revoke all on function submit_alltime_score(text, numeric, numeric, text) from public;
grant execute on function submit_alltime_score(text, numeric, numeric, text) to authenticated;
```

## Setup (manual, one-time, on the user)

1. In Google Cloud Console, create an OAuth 2.0 Client ID (web
   application). Authorized redirect URI:
   `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
   (Supabase's own callback, not noodlegames.co's — Supabase sits in
   front of the provider; the hub's `/auth/callback` is where
   *Supabase* redirects back to afterward).
2. In GitHub → Settings → Developer settings → OAuth Apps, create a new
   app with the same Supabase callback URL as the "Authorization
   callback URL".
3. In the Supabase dashboard → Authentication → Providers, enable
   Google and GitHub, pasting in each client id/secret from steps 1-2.
4. In Supabase dashboard → Authentication → URL Configuration, add
   `https://noodlegames.co/auth/callback` as an additional redirect URL
   (this is the one the hub's own code will request after Supabase's
   own OAuth handoff completes).
5. Run the SQL above in the Supabase SQL editor (same project
   everything else already lives in).
6. Seed `leaderboard_alltime_games` once each game's scoring map is
   confirmed — same values as `leaderboard_games` (sort_direction,
   tiebreak_direction), just also present here.

## Explicitly out of scope for this pass

- Account settings/profile page beyond "set your display name once."
- Display name history (changing it doesn't relabel past board rows
  until the next improving submission, see note above).
- Deleting an account or its all-time scores (would need a real
  account-deletion flow — not built yet).
- Linking a Google and a GitHub sign-in to the same person if they use
  both (Supabase treats them as separate users unless email-linking is
  explicitly configured — revisit if it comes up).
