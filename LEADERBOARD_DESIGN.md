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
  initials text not null check (initials ~ '^[A-Z0-9]{3}$'),
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
  if length(v_initials) <> 3 then
    raise exception 'initials must be exactly 3 letters/digits';
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
