import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Login.css';

const DEFAULT_RETURN = 'https://noodlegames.co/';

export default function Logout() {
  const [params] = useSearchParams();
  const returnTo = params.get('return') || DEFAULT_RETURN;

  useEffect(() => {
    (async () => {
      if (supabase) await supabase.auth.signOut();
      location.href = returnTo;
    })();
  }, [returnTo]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-sub">Signing you out…</p>
      </div>
    </div>
  );
}
