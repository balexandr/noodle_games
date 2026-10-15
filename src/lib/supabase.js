import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cross-subdomain auth session storage — see LEADERBOARD_DESIGN.md's
// "All-Time Leaderboard (accounts)" section. The hub is the only place
// that runs the actual OAuth flow (via /login, /auth/callback), so the
// session it creates here has to land somewhere every other
// subdomain can read it from — localStorage wouldn't cross subdomains.
// This persists it in a cookie scoped to .noodlegames.co instead.
// Accepted tradeoff (not HttpOnly, since the client needs to read it)
// is written up in that doc.
const SESSION_COOKIE = 'noodle_session'

function cookieDomain() {
  return typeof location !== 'undefined' && location.hostname.endsWith('noodlegames.co')
    ? '.noodlegames.co'
    : ''
}

const cookieAuthStorage = {
  getItem() {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`))
      return match ? decodeURIComponent(match[1]) : null
    } catch {
      return null
    }
  },
  setItem(_key, value) {
    try {
      const domain = cookieDomain()
      const secure = location.protocol === 'https:' ? '; secure' : ''
      document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(value)}; max-age=8640000; path=/; samesite=lax${domain ? `; domain=${domain}` : ''}${secure}`
    } catch {}
  },
  removeItem() {
    try {
      const domain = cookieDomain()
      document.cookie = `${SESSION_COOKIE}=; max-age=0; path=/; samesite=lax${domain ? `; domain=${domain}` : ''}`
    } catch {}
  },
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { storage: cookieAuthStorage } })
  : null

export function getDeviceId() {
  const key = 'noodle-device-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
