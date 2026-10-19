import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'
import { NoodleLogoIcon } from './NoodleLogo'
import { Avatar } from './Avatar'
import { supabase } from '../lib/supabase'

function Header() {
  const [user, setUser] = useState(undefined) // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setUser(null)
      return
    }
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || !supabase) {
      setProfile(null)
      return
    }
    supabase
      .from('player_profiles')
      .select('display_name, avatar_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [user])

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <NoodleLogoIcon size={30} />
          <span className="logo-text">NoodleGames</span>
        </Link>
        <nav className="nav">
          <a href="#games" className="nav-link">Games</a>
          <a href="#about" className="nav-link">About</a>
          {user ? (
            <Link to="/profile" className="account-link">
              <Avatar id={profile?.avatar_id} size={26} />
              <span className="account-name">{profile?.display_name || 'Profile'}</span>
            </Link>
          ) : (
            <Link to={`/login?return=${encodeURIComponent('https://noodlegames.co/')}`} className="signin-link">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
