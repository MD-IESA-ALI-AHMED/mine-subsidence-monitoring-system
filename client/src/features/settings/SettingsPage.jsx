import { useSite } from '../../services/queries.js';
import { useThemeStore } from '../../store/themeStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { SegmentedControl, Toggle } from '../../ui/Controls.jsx';
import { InlineError, Panel, SkeletonRows } from '../../ui/Panel.jsx';
import { playCriticalTone } from '../../utils/sound.js';
import { PART_LABELS } from '../forecast/ScoreBar.jsx';
import s from './SettingsPage.module.css';

const THRESHOLD_ROWS = [
  ['gateOn_mm', 'Gate opens: 24 h change', 'mm'],
  ['gateOnSpeed_mmPerDay', 'Gate opens: speed', 'mm/day'],
  ['gateOff_mm', 'Gate closes: 24 h change below', 'mm'],
  ['gateOffSpeed_mmPerDay', 'Gate closes: speed below', 'mm/day'],
  ['holdMinutes', 'Gate stays open after quiet for', 'min'],
  ['neighbourRadius_m', 'Neighbourhood radius', 'm'],
  ['minCorroborating', 'Units that must agree', ''],
  ['limitSinking_mm', 'Limit: sinking beyond expected', 'mm'],
  ['limitSpeed_mmPerDay', 'Limit: speed', 'mm/day'],
  ['limitTilt_mmPerM', 'Limit: tilt', 'mm/m'],
  ['acceleratingMin_mmPerDay2', 'Speeding up: at least', 'mm/day²'],
  ['fastModeRadius_m', 'Fast mode within', 'm of a zone'],
];

function Row({ label, children }) {
  return (
    <div className={s.row}>
      <span className={s.label}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  const theme = useThemeStore((st) => st.theme);
  const setTheme = useThemeStore((st) => st.setTheme);
  const settings = useUiStore((st) => st.settings);
  const setSetting = useUiStore((st) => st.setSetting);
  const site = useSite();
  const th = site.data?.thresholds;

  return (
    <div className={s.page}>
      <Panel label="Display">
        <Row label="Theme">
          <SegmentedControl
            label="Theme"
            value={theme ?? 'system'}
            onChange={(v) => setTheme(v === 'system' ? null : v)}
            options={[
              { value: 'system', label: 'Follow system' },
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
        </Row>
        <Row label="Tilt">
          <SegmentedControl
            label="Tilt unit"
            value={settings.tiltUnit}
            onChange={(v) => setSetting('tiltUnit', v)}
            options={[
              { value: 'mmPerM', label: 'mm/m' },
              { value: 'deg', label: 'degrees' },
            ]}
          />
        </Row>
        <Row label="Time">
          <SegmentedControl
            label="Time format"
            value={settings.hour12 ? '12' : '24'}
            onChange={(v) => setSetting('hour12', v === '12')}
            options={[
              { value: '24', label: '24-hour' },
              { value: '12', label: '12-hour' },
            ]}
          />
        </Row>
        <Row label="Sound">
          <Toggle
            label="Play a tone for new critical alerts"
            checked={settings.criticalSound}
            onChange={(v) => {
              setSetting('criticalSound', v);
              if (v) playCriticalTone();
            }}
          />
        </Row>
      </Panel>

      <Panel label="Thresholds and severity weights">
        <p className={s.note}>
          Read-only. These are set in configuration (<code>site.thresholds</code> in{' '}
          <code>server/data/dummy/scenarios.json</code>) so they cannot be changed from a browser.
        </p>
        {site.isPending && <SkeletonRows rows={6} />}
        {site.isError && <InlineError message="Could not load the site." onRetry={site.refetch} />}
        {th && (
          <div className={s.columns}>
            <dl className={s.kv}>
              {THRESHOLD_ROWS.map(([key, label, unit]) => (
                <div key={key} className={s.kvRow}>
                  <dt>{label}</dt>
                  <dd className="mono">
                    {th[key]} <span className={s.unit}>{unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <dl className={s.kv}>
              {Object.entries(th.severity.weights).map(([k, w]) => (
                <div key={k} className={s.kvRow}>
                  <dt>{PART_LABELS[k]}</dt>
                  <dd className="mono">{w} points</dd>
                </div>
              ))}
              <div className={s.kvRow}>
                <dt>Tier cut-offs</dt>
                <dd className="mono">
                  watch {th.severity.tierCutoffs.watch} · warning {th.severity.tierCutoffs.warning}{' '}
                  · critical {th.severity.tierCutoffs.critical}
                </dd>
              </div>
              <div className={s.kvRow}>
                <dt>Always critical when the limit is closer than</dt>
                <dd className="mono">{th.severity.criticalBelow_h} h</dd>
              </div>
            </dl>
          </div>
        )}
      </Panel>
    </div>
  );
}
