import { useThemeTokens } from '../../hooks/useThemeTokens.js';
import { colourFor } from '../mesh3d/colourScales.js';
import { meshTreeLayout } from './meshTreeLayout.js';
import s from './NetworkPage.module.css';

const W = 300;

/** Root at the top, relays by mesh layer, each with the number of units reporting to it. */
export function MeshTree({ nodes, linkState }) {
  const tokens = useThemeTokens();
  const t = meshTreeLayout(nodes, linkState?.links ?? [], { width: W });
  return (
    <figure className={s.tree}>
      <svg
        viewBox={`0 0 ${W} ${t.height + 10}`}
        className={s.treeSvg}
        role="img"
        aria-label="Mesh tree"
      >
        {t.edges.map((e) => (
          <line
            key={`${e.from.id}-${e.to.id}`}
            x1={e.from.x}
            y1={e.from.y}
            x2={e.to.x}
            y2={e.to.y}
            stroke="var(--line-strong)"
            strokeWidth="1.5"
          />
        ))}
        {t.relays.map((r) => (
          <g key={r.id}>
            {r.layer === 1 ? (
              <rect
                x={r.x - 7}
                y={r.y - 7}
                width="14"
                height="14"
                fill={colourFor('meshLayer', 1, tokens.theme)}
              />
            ) : (
              <circle
                cx={r.x}
                cy={r.y}
                r="6"
                fill={r.down ? 'none' : colourFor('meshLayer', r.layer, tokens.theme)}
                stroke={r.down ? 'var(--offline)' : 'none'}
              />
            )}
            <text x={r.x} y={r.y - 11} textAnchor="middle" className={s.treeLabel}>
              {r.id}
            </text>
            <text x={r.x} y={r.y + 18} textAnchor="middle" className={s.treeCount}>
              {r.count} units
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={s.treeCaption}>
        Root {linkState?.rootId ?? '—'}
        {linkState?.degraded ? ` · degraded: ${linkState.reason}` : ''}
        {t.detached.length ? ` · not in the tree: ${t.detached.join(', ')}` : ''}
      </figcaption>
    </figure>
  );
}
