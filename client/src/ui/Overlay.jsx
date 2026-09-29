import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button.jsx';
import s from './Overlay.module.css';

/** Small floating label on hover or keyboard focus. */
export function Tooltip({ text, children, placement = 'above' }) {
  const id = useId();
  if (!text) return children;
  return (
    <span className={`${s.tipWrap} ${placement === 'below' ? s.below : ''}`} aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} className={s.tip}>
        {text}
      </span>
    </span>
  );
}

/** Right-hand drawer over the page. Escape closes it; focus moves into it when it opens. */
export function Drawer({ title, badge, onClose, children, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <aside className={s.drawer} role="dialog" aria-label={label ?? title} tabIndex={-1} ref={ref}>
      <div className={s.drawerHeader}>
        {badge}
        <div className={s.drawerTitle}>{title}</div>
        <IconButton icon={X} label="Close" onClick={onClose} />
      </div>
      <div className={s.drawerBody}>{children}</div>
    </aside>
  );
}
