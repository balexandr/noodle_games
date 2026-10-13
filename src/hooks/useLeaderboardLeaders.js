import { useEffect, useState } from 'react'
import { fetchTodayLeaders } from '../utils/leaderboardLeaders'

// leaders: { [gameId]: { initials, score_display } | null }
export function useLeaderboardLeaders(gameIds) {
  const [leaders, setLeaders] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchTodayLeaders(gameIds).then((result) => {
      if (cancelled) return
      setLeaders(result)
      setLoaded(true)
    })
    return () => { cancelled = true }
    // gameIds is the static games.js list, stable across renders — fetch
    // once on mount, same as useGameRatings does for ratings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { leaders, loaded }
}
