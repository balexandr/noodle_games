import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Login.css';

const DEFAULT_RETURN = 'https://noodlegames.co/';
const NAME_MIN = 3;
const NAME_MAX = 20;

// Runs once after the OAuth provider redirects back to the hub.
// Supabase's client auto-detects the auth code in the URL and exchanges
// it (detectSessionInUrl defaults to true), landing the session in the
// shared cookie set up in supabase.js. Once that resolves, a
// first-time sign-in gets one display-name prompt here — centralized
// on the hub so none of the 11 games need their own copy of this form
// — then every sign-in redirects back to `return`.
export default function AuthCallback() {
  const [params] = useSearchParams();
  const returnTo = params.get('return') || DEFAULT_RETURN;
  const [status, setStatus] = useState('working'); // working | needsName | error
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      return;
    }
    let settled = false;

    const proceed = async (userId) => {
      if (settled) return;
      settled = true;
      const { data } = await supabase
        .from('player_profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.display_name) {
        location.href = returnTo;
      } else {
        setStatus('needsName');
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) proceed(session.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) proceed(data.session.user.id);
    });
    const timeout = setTimeout(() => {
      if (!settled) setStatus('error');
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [returnTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) return;
    setSubmitting(true);
    setNameError(null);
    const { error } = await supabase.rpc('set_display_name', { p_display_name: trimmed });
    setSubmitting(false);
    if (error) {
      setNameError(error.message);
      return;
    }
    location.href = returnTo;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {status === 'working' && <p className="auth-sub">Signing you in…</p>}

        {status === 'error' && (
          <>
            <h1>Sign-in didn't go through</h1>
            <p className="auth-sub">Head back to the game and try again.</p>
          </>
        )}

        {status === 'needsName' && (
          <form onSubmit={handleSubmit}>
            <h1>Pick a display name</h1>
            <p className="auth-sub">
              Shown on all-time leaderboards instead of your email. {NAME_MIN}-{NAME_MAX} characters, letters/numbers/spaces/-/_ only.
            </p>
            <input
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              autoFocus
              aria-label="Display name"
            />
            {nameError && <p className="auth-error">{nameError}</p>}
            <button
              type="submit"
              className="auth-btn"
              disabled={name.trim().length < NAME_MIN || submitting}
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
