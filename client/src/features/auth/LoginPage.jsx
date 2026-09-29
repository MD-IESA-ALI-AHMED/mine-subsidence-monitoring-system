import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../../services/api.js';
import { useLogin, useMe } from '../../services/queries.js';
import { Button } from '../../ui/Button.jsx';
import { StaticContours } from '../intro/StaticContours.jsx';
import s from './LoginPage.module.css';

const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'Site 01';

/** Only allow same-app paths after sign-in. */
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const me = useMe();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const next = safeNext(params.get('next'));

  if (me.data) return <Navigate to={next} replace />;

  const submit = (e) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(next, { replace: true }) });
  };

  return (
    <main className={s.page}>
      <StaticContours className={s.contours} />
      <form className={s.form} onSubmit={submit} noValidate>
        <div>
          <h1 className={s.site}>{SITE_NAME}</h1>
          <p className={s.line}>Subsidence monitoring — sign in</p>
        </div>
        <label className={s.field}>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className={s.field}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {login.isError && (
          <p className={s.error} role="alert">
            {errorMessage(login.error, 'Could not sign in')}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          className={s.submit}
          disabled={login.isPending || !email || !password}
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
