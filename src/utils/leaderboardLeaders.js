import { supabase } from '../lib/supabase'

// Odd One Out has three separate leaderboard tracks (one per difficulty,
// see noodle_games/LEADERBOARD_DESIGN.md) but only one card on the hub.
// Show the hardest difficulty with a score today, falling back to an
// easier one if hard hasn't been played yet — a single honest "today's
// best" rather than three numbers crammed onto one card.
const ODD_ONE_OUT_TRACKS = ['odd-one-out-hard', 'odd-one-out-medium', 'odd-one-out-easy']

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
}

function isBetter(a, b, direction) {
  return direction === 'asc' ? a < b : a > b
}

// gameIds: the hub's own game ids (games.js). Returns
// { [gameId]: { initials, score_display } | null }.
export async function fetchTodayLeaders(gameIds) {
  if (!supabase) return {}

  const dateKey = getTodayKey()
  const leaderboardIds = Array.from(new Set(
    gameIds.flatMap((id) => (id === 'odd-one-out' ? ODD_ONE_OUT_TRACKS : [id]))
  ))

  const [{ data: configs }, { data: rows }] = await Promise.all([
    supabase.from('leaderboard_games').select('game_id, sort_direction').in('game_id', leaderboardIds),
    supabase.from('leaderboard_scores').select('game_id, initials, score, score_display').eq('date', dateKey).in('game_id', leaderboardIds),
  ])

  if (!configs || !rows) return {}

  const directionByGame = Object.fromEntries(configs.map((c) => [c.game_id, c.sort_direction]))

  const bestByGame = {}
  for (const row of rows) {
    const direction = directionByGame[row.game_id]
    const current = bestByGame[row.game_id]
    if (!current || isBetter(row.score, current.score, direction)) {
      bestByGame[row.game_id] = row
    }
  }

  const leaders = {}
  for (const id of gameIds) {
    if (id === 'odd-one-out') {
      leaders[id] = ODD_ONE_OUT_TRACKS.map((track) => bestByGame[track]).find(Boolean) || null
    } else {
      leaders[id] = bestByGame[id] || null
    }
  }
  return leaders
}
