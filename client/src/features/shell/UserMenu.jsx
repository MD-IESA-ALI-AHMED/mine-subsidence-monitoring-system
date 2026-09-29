import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../../services/queries.js';
import s from './TopBar.module.css';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export function UserMenu() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) });

  return (
    <div className={s.menuWrap} ref={ref}>
      <button
        type="button"
        className={s.avatar}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${me?.name ?? ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {initials(me?.name)}
        <ChevronDown size={12} strokeWidth={1.5} aria-hidden />
      </button>
      {open && (
        <div className={s.menu} role="menu">
          <div className={s.menuHead}>
            <strong>{me?.name}</strong>
            {me?.email}
          </div>
          <button type="button" role="menuitem" className={s.menuItem} onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
