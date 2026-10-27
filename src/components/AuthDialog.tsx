import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUi } from '../store/ui';
import { appUrl, cloudEnabled, supabase } from '../lib/supabase';
import { toast } from '../store/toast';
import * as I from './Icons';

/** Sign in / create account. Without Supabase keys it explains guest mode instead. */
export function AuthDialog() {
  const { authOpen, authMode } = useUi();
  return authOpen ? <AuthForm key={authMode} /> : null;
}

function AuthForm() {
  const { authMode, closeAuth, openAuth } = useUi();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => first.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAuth();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [closeAuth]);

  const signup = authMode === 'signup';

  const guest = () => {
    closeAuth();
    navigate('/tree');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name }, emailRedirectTo: appUrl('tree') },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice('Check your inbox to confirm your email, then sign in.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      toast(signup ? 'Welcome to your family chronicle' : 'Welcome back');
      closeAuth();
      navigate('/tree');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl('tree') },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}>
      <div className="folio auth" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="p-close" aria-label="Close" onClick={closeAuth}>
          <I.X />
        </button>
        <I.Crest className="auth-crest" />
        <h2 id="auth-title">{signup ? 'Create your account' : 'Welcome back'}</h2>
        <p className="lead">
          {signup
            ? 'Keep your tree and logbook safe in your account and open them on any device.'
            : 'Sign in to continue your family chronicle.'}
        </p>

        {cloudEnabled ? (
          <>
            <div className="seg" role="tablist" aria-label="Account">
              <button role="tab" aria-selected={!signup} onClick={() => openAuth('signin')}>
                Sign in
              </button>
              <button role="tab" aria-selected={signup} onClick={() => openAuth('signup')}>
                Create account
              </button>
            </div>
            <form onSubmit={submit} className="form">
              {signup && (
                <label className="field">
                  <span>Your name</span>
                  <input
                    ref={first}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="field">
                <span>Email</span>
                <input
                  ref={signup ? undefined : first}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                />
                {signup && <small>At least 8 characters.</small>}
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {notice && <p className="form-note">{notice}</p>}
              <button className="btn primary wide" disabled={busy}>
                {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
              </button>
            </form>
            <div className="or">
              <span>or</span>
            </div>
            <button className="btn subtle wide google" onClick={google}>
              <I.Google width={18} height={18} /> Continue with Google
            </button>
            <button className="linkish" onClick={guest}>
              Continue without an account
            </button>
          </>
        ) : (
          <>
            <p className="form-note">
              Accounts aren’t switched on for this copy of the site yet. You can still build your
              whole tree and logbook — they’re saved privately in this browser.
            </p>
            <button className="btn primary wide" onClick={guest}>
              Continue on this device
            </button>
          </>
        )}
      </div>
    </div>
  );
}
