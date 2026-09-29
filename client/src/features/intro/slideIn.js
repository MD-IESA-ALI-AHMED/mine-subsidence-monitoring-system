/** Inline style for a region sliding 8 px in from one side while fading in (opening animation). */
export function slideIn(progress, from) {
  if (progress >= 1) return undefined;
  const d = (1 - progress) * 8;
  const offset = { top: `0, ${-d}px`, bottom: `0, ${d}px`, left: `${-d}px, 0`, right: `${d}px, 0` }[
    from
  ];
  return {
    opacity: progress,
    transform: `translate(${offset})`,
    pointerEvents: progress < 1 ? 'none' : undefined,
  };
}
