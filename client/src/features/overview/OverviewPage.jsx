import { useEffect } from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { IconButton } from '../../ui/Button.jsx';
import { Drawer } from '../../ui/Overlay.jsx';
import { slideIn } from '../intro/slideIn.js';
import { useIntroController, useIntroUi } from '../intro/useIntroTimeline.js';
import { ContextPanel, contextTitle } from './ContextPanel.jsx';
import { LeftRail } from './LeftRail.jsx';
import { SceneRegion } from './SceneRegion.jsx';
import s from './OverviewPage.module.css';

function CollapsedStrip({ icon, label, onExpand }) {
  return (
    <div className={s.collapsedStrip}>
      <IconButton icon={icon} label={label} onClick={onExpand} />
    </div>
  );
}

export default function OverviewPage() {
  const { railCollapsed, panelCollapsed, toggleRail, togglePanel } = useUiStore();
  const selected = useSelectionStore((st) => st.selected);
  const clear = useSelectionStore((st) => st.clear);
  const narrow = useMediaQuery('(max-width: 1279px)');
  const tiny = useMediaQuery('(max-width: 899px)');
  useIntroController();
  const ui = useIntroUi(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clear]);

  const style = {
    '--rail-col': railCollapsed && !tiny ? 'var(--collapsed-w)' : 'var(--rail-w)',
    '--panel-col': panelCollapsed ? 'var(--collapsed-w)' : 'var(--panel-w)',
  };

  return (
    <div className={s.layout} style={style}>
      <aside className={s.rail} aria-label="Moving zones and alerts" style={slideIn(ui, 'left')}>
        {railCollapsed && !tiny ? (
          <CollapsedStrip icon={PanelLeft} label="Show zones and alerts" onExpand={toggleRail} />
        ) : (
          <LeftRail />
        )}
      </aside>

      <section className={s.centre} aria-label="Site view">
        <SceneRegion />
      </section>

      {!narrow && (
        <aside className={s.panel} aria-label="Details" style={slideIn(ui, 'right')}>
          {panelCollapsed ? (
            <CollapsedStrip icon={PanelRight} label="Show details panel" onExpand={togglePanel} />
          ) : (
            <ContextPanel />
          )}
        </aside>
      )}
      {narrow && selected && (
        <Drawer title={contextTitle(selected)} onClose={clear}>
          <ContextPanel embedded />
        </Drawer>
      )}
    </div>
  );
}
