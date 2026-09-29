import { useEffect, useState } from 'react';
import { useStatus } from '../../services/queries.js';
import { useLiveStore, useSiteNow } from '../../store/liveStore.js';
import { statusItems } from './statusItems.js';
import s from './TopBar.module.css';

/** One line of dot + text items; an item turns warning or critical colour when unhealthy. */
export function StatusStrip() {
  const { data: status } = useStatus();
  const siteNow = useSiteNow();
  const conn = useLiveStore((st) => st.conn);
  const lastMessageWall = useLiveStore((st) => st.lastMessageWall);
  const [wallNow, setWallNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setWallNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const items = statusItems({ status, siteNow, conn, lastMessageWall, wallNow });
  return (
    <ul className={s.strip} aria-label="System status">
      {items.map((it) => (
        <li key={it.key} className={`${s.item} ${s[it.level] ?? ''}`} title={it.title}>
          {it.level !== 'muted' && <span className={s.dot} aria-hidden />}
          {it.text}
        </li>
      ))}
    </ul>
  );
}
