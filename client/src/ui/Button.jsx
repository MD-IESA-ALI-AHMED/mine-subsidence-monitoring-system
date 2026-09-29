import { forwardRef } from 'react';
import s from './Button.module.css';

const cx = (...c) => c.filter(Boolean).join(' ');

/** variant: default | primary | quiet; size: default | small */
export const Button = forwardRef(function Button(
  { variant = 'default', size, active, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        s.button,
        variant !== 'default' && s[variant],
        size === 'small' && s.small,
        active && s.active,
        className,
      )}
      {...props}
    />
  );
});

/** Square button with an icon; `label` is required and becomes the accessible name and tooltip. */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, size, variant = 'quiet', active, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      className={cx(
        s.button,
        s.icon,
        s[variant],
        size === 'small' && s.small,
        active && s.active,
        className,
      )}
      {...props}
    >
      <Icon size={size === 'small' ? 14 : 16} strokeWidth={1.5} aria-hidden />
    </button>
  );
});
