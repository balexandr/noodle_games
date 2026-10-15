# Player Profile — Design Doc

Started 2026-10-14, right after the all-time leaderboard/accounts work
(see LEADERBOARD_DESIGN.md's "All-Time Leaderboard (accounts)"
section — this doc assumes that foundation: Supabase Auth, the
cross-subdomain cookie session, `player_profiles`, and the hub as the
one place that runs auth flows). Confirmed with user during scoping:

- Avatar: a **preset icon set**, not a photo upload or the player's
  real Google/GitHub profile photo — same privacy reasoning that
  already put a chosen display name instead of an email on the
  leaderboard.
- History: a **full play-by-play log of every finished game, win or
  lose** — not just a "your best score per game" summary. This is a
  real step up from anything built so far: today's stats
  (`useStats.js`) are local-only, per-device, never synced to the
  server. This adds a genuine second write path alongside the
  all-time-board submission, firing on every game completion in every
  one of the 12 games, not just a qualifying win.
- Lives on the hub at `noodlegames.co/profile` — same centralization
  reasoning as `/login`: one page, not 12 copies.
- Piloting on Mirror first (same reasoning as the leaderboard and
  all-time rollouts), then rolling to the other 11 once verified live.

## Avatar set

12 presets, matching the suite's existing "simple, same feel, each
unique" icon convention (every game already has its own one-color line
icon for its logo — these follow the same spirit): `fox`, `owl`,
`cat`, `robot`, `ghost`, `rocket`, `star`, `bolt`, `wave`, `diamond`,
`moon`, `sun`. Stored as a plain `avatar_id` string, not a foreign key
to a table — the known-good set lives in the client code (one shared
`Avatar.jsx`, same "copied byte-for-byte, kept in sync" convention as
`shareAll.js`), not the database, so adding a 13th avatar later never
needs a migration. The RPC below only checks shape (short lowercase
slug), not a fixed list — an unrecognized id just falls back to a
default icon client-side, not a hard error.

## Data model additions (Supabase / Postgres)

```sql
alter table player_profiles add column avatar_id text not null default 'default';

create or replace function set_avatar(p_avatar_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;
  if p_avatar_id !~ '^[a-z]{1,20}$' then
    raise exception 'invalid avatar id';
  end if;
  update player_profiles set avatar_id = p_avatar_id where user_id = auth.uid();
end;
$$;

revoke all on function set_avatar(text) from public;
grant execute on function set_avatar(text) to authenticated;

-- Denormalized onto leaderboard_alltime_scores too, same tradeoff
-- display_name already made there (stale until the next improving
-- submission, no join needed to render a board).
alter table leaderboard_alltime_scores add column avatar_id text not null default 'default';

-- submit_alltime_score needs to also read + insert avatar_id —
-- replacing the whole function (signature is unchanged, only the body
-- adds avatar_id alongside display_name).
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
  v_avatar_id text;
  v_existing_score numeric;
  v_other_count int;
  v_better_count int;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to submit to the all-time board';
  end if;

  select display_name, avatar_id into v_display_name, v_avatar_id from player_profiles where user_id = auth.uid();
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
    (game_id, user_id, display_name, avatar_id, score, tiebreak, score_display)
  values
    (p_game_id, auth.uid(), v_display_name, v_avatar_id, p_score, p_tiebreak, p_score_display)
  on conflict (game_id, user_id) do update
    set score = excluded.score,
        tiebreak = excluded.tiebreak,
        score_display = excluded.score_display,
        display_name = excluded.display_name,
        avatar_id = excluded.avatar_id,
        updated_at = now()
    where case when v_game.sort_direction = 'asc'
            then excluded.score < leaderboard_alltime_scores.score
            else excluded.score > leaderboard_alltime_scores.score end;

  return query select true, (v_better_count + 1);
end;
$$;

-- One row per finished game per player per day (win OR lose) — unlike
-- leaderboard_alltime_scores, which only ever keeps your single
-- best-ever row, this is a real log: date-scoped like the daily
-- board, not score-scoped like the all-time one.
create table game_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references leaderboard_games(game_id),
  date date not null,
  outcome text not null check (outcome in ('won', 'lost')),
  score_display text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id, date)
);

alter table game_history enable row level security;

-- A full play log is personal, not public the way a leaderboard row
-- is — only the player themselves can read their own history, unlike
-- every other table in this suite (all previously public-readable,
-- gated only on sort-key correctness, not on who's asking).
create policy "players can read their own history" on game_history
  for select using (auth.uid() = user_id);

-- No grant to anon, no insert/update policy for authenticated either
-- — same "write only through a function" shape as everything else.

create or replace function record_game_history(
  p_game_id text,
  p_outcome text,
  p_score_display text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
begin
  -- Silent no-op for a signed-out player, not an error — this gets
  -- called on every game completion regardless of auth state, same as
  -- the existing local-only recordGame/recordTodayShare calls it sits
  -- next to, and most players won't be signed in.
  if auth.uid() is null then
    return;
  end if;
  if p_outcome not in ('won', 'lost') then
    raise exception 'invalid outcome: %', p_outcome;
  end if;
  if p_score_display is null or length(p_score_display) = 0 or length(p_score_display) > 40 then
    raise exception 'invalid score_display';
  end if;

  v_date := (now() at time zone 'America/New_York')::date;

  insert into game_history (user_id, game_id, date, outcome, score_display)
  values (auth.uid(), p_game_id, v_date, p_outcome, p_score_display)
  on conflict (user_id, game_id, date) do update
    set outcome = excluded.outcome, score_display = excluded.score_display, created_at = now();
end;
$$;

revoke all on function record_game_history(text, text, text) from public;
grant execute on function record_game_history(text, text, text) to authenticated;
```

## Client

- `record_game_history` is called from the same effect that already
  calls `recordGame`/`recordTodayShare` on game end, in every game —
  fire-and-forget (not awaited in a way that blocks the UI, wrapped so
  a network failure never surfaces to the player), and only fires when
  signed in (`getCurrentUser()` first — cheap no-op RPC call otherwise,
  could just as easily skip the call entirely client-side too, but
  letting the RPC no-op keeps the call site identical across all 12
  games regardless of sign-in state, same "games don't special-case
  this" spirit as the rest of the account layer).
- `noodle_games/src/pages/Profile.jsx` (new, routed at `/profile`):
  avatar grid (12 buttons, calls `set_avatar`), display name (reuses
  `set_display_name`, same control already built into
  `/auth/callback`), and the history list — fetched from `game_history`
  for `auth.uid()`, newest first, each row showing the game's own name
  and accent color (pulled from the hub's existing
  `src/data/games.js`, not duplicated) plus outcome and score_display.
- Leaderboard rows (all-time board only) render the avatar next to the
  display name now — `Avatar.jsx` maps `avatar_id` to one of the 12
  inline SVGs, shared across every game the same way `GameLogo.jsx`
  already is per-game but this one file is identical everywhere.

## Explicitly out of scope for this pass

- Editing or deleting individual history rows.
- Any chart/stats view over the history (streaks, win rate) beyond the
  raw list — `useStats.js` already does local streak math per game;
  duplicating that server-side isn't needed for a first pass.
- Uploading a custom avatar image.
- Backfilling history for games played before this feature existed
  (no data to backfill from — today's stats were always local-only).
