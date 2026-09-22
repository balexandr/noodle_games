import { useCallback, useEffect, useState } from 'react'
import { supabase, getDeviceId } from '../lib/supabase'

// stats: { [gameId]: { avg: number, count: number } }
// mine:  { [gameId]: number } — the current visitor's own submitted rating
export function useGameRatings() {
  const [stats, setStats] = useState({})
  const [mine, setMine] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoaded(true)
      return
    }

    let cancelled = false
    const deviceId = getDeviceId()

    async function load() {
      const [statsRes, mineRes] = await Promise.all([
        supabase.from('game_rating_stats').select('game_id, avg_rating, rating_count'),
        supabase.from('game_ratings').select('game_id, rating').eq('device_id', deviceId),
      ])

      if (cancelled) return

      if (!statsRes.error && statsRes.data) {
        const next = {}
        for (const row of statsRes.data) {
          next[row.game_id] = { avg: Number(row.avg_rating), count: row.rating_count }
        }
        setStats(next)
      }

      if (!mineRes.error && mineRes.data) {
        const next = {}
        for (const row of mineRes.data) {
          next[row.game_id] = row.rating
        }
        setMine(next)
      }

      setLoaded(true)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const submitRating = useCallback(async (gameId, rating) => {
    if (!supabase) return
    const deviceId = getDeviceId()

    setMine((prev) => ({ ...prev, [gameId]: rating }))

    const { error } = await supabase
      .from('game_ratings')
      .upsert({ game_id: gameId, device_id: deviceId, rating, updated_at: new Date().toISOString() }, { onConflict: 'game_id,device_id' })

    if (error) return

    const { data, error: statsError } = await supabase
      .from('game_rating_stats')
      .select('avg_rating, rating_count')
      .eq('game_id', gameId)
      .maybeSingle()

    if (!statsError && data) {
      setStats((prev) => ({ ...prev, [gameId]: { avg: Number(data.avg_rating), count: data.rating_count } }))
    }
  }, [])

  return { stats, mine, loaded, submitRating }
}
