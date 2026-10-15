import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Avatar, AVATAR_IDS } from '../components/Avatar';
import { games } from '../data/games';
import './Profile.css';

const NAME_MIN = 3;
const NAME_MAX = 20;
const gamesById = Object.fromEntries(games.map((g) => [g.id, g]));

export default function Profile() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null); // { display_name, avatar_id }
  const [history, setHistory] = useState(null);

  const [name, setName] = useState('');
  const [nameEditing, setNameEditing] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState(null);

  const [avatarSaving, setAvatarSaving] = useState(null); // which id is in flight

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('player_profiles')
      .select('display_name, avatar_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setName(data.display_name);
    }
  }, []);

  const loadHistory = useCallback(async (userId) => {
    const { data } = await supabase
      .from('game_history')
      .select('game_id, date, outcome, score_display')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    setHistory(data || []);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile(user.id);
      loadHistory(user.id);
    }
  }, [user, loadProfile, loadHistory]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) return;
    setNameSaving(true);
    setNameError(null);
    const { error } = await supabase.rpc('set_display_name', { p_display_name: trimmed });
    setNameSaving(false);
    if (error) {
      setNameError(error.message);
      return;
    }
    setProfile((p) => ({ ...p, display_name: trimmed }));
    setNameEditing(false);
  };

  const handlePickAvatar = async (id) => {
    if (avatarSaving) return;
    setAvatarSaving(id);
    const { error } = await supabase.rpc('set_avatar', { p_avatar_id: id });
    setAvatarSaving(null);
    if (!error) setProfile((p) => ({ ...p, avatar_id: id }));
  };

  if (user === undefined) {
    return <div className="profile-page"><p className="profile-loading">Loading…</p></div>;
  }

  if (user === null) {
    return (
      <div className="profile-page">
        <div className="profile-card profile-signedout">
          <h1>Your profile</h1>
          <p className="profile-sub">Sign in to pick an avatar and see your game history.</p>
          <Link className="profile-signin-btn" to={`/login?return=${encodeURIComponent(location.origin + '/profile')}`}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1>Your profile</h1>

        <div className="profile-row">
          <Avatar id={profile?.avatar_id} size={56} />
          <div className="profile-name-block">
            {!nameEditing && (
              <>
                <span className="profile-name">{profile?.display_name || '—'}</span>
                <button type="button" className="profile-link-btn" onClick={() => setNameEditing(true)}>edit name</button>
              </>
            )}
            {nameEditing && (
              <form onSubmit={handleSaveName} className="profile-name-form">
                <input
                  className="profile-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={NAME_MAX}
                  autoFocus
                  aria-label="Display name"
                />
                <button type="submit" className="profile-save-btn" disabled={name.trim().length < NAME_MIN || nameSaving}>
                  {nameSaving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="profile-link-btn" onClick={() => { setName(profile?.display_name || ''); setNameEditing(false); setNameError(null); }}>
                  cancel
                </button>
              </form>
            )}
            {nameError && <p className="profile-error">{nameError}</p>}
          </div>
        </div>

        <p className="profile-section-label">Avatar</p>
        <div className="profile-avatar-grid">
          {AVATAR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`profile-avatar-btn ${profile?.avatar_id === id ? 'profile-avatar-active' : ''}`}
              onClick={() => handlePickAvatar(id)}
              disabled={!!avatarSaving}
              aria-label={id}
            >
              <Avatar id={id} size={40} />
            </button>
          ))}
        </div>

        <p className="profile-section-label">Game history</p>
        {history === null && <p className="profile-loading">Loading…</p>}
        {history && history.length === 0 && (
          <p className="profile-empty">Nothing yet — play a game signed in and it'll show up here.</p>
        )}
        {history && history.length > 0 && (
          <ul className="profile-history">
            {history.map((row) => {
              const game = gamesById[row.game_id];
              return (
                <li key={`${row.game_id}-${row.date}`} className="profile-history-row">
                  <span className="profile-history-date">{row.date}</span>
                  <span className="profile-history-game">{game?.title || row.game_id}</span>
                  <span className={`profile-history-outcome profile-history-${row.outcome}`}>
                    {row.outcome === 'won' ? 'Won' : 'Lost'}
                  </span>
                  <span className="profile-history-score">{row.score_display}</span>
                </li>
              );
            })}
          </ul>
        )}

        <Link to="/" className="profile-back">← Back to NoodleGames</Link>
      </div>
    </div>
  );
}
