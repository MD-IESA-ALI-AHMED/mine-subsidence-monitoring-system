import { useRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { TIER_SHAPES } from '@subsidence/shared';
import { useAlerts, useEvents, useMeshHistory, useSite } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { PLAY_SPEEDS_H, useTimeStore } from '../../store/timeStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { Button, IconButton } from '../../ui/Button.jsx';
import { SegmentedControl } from '../../ui/Controls.jsx';
import { HOUR_MS, formatDateTime } from '../../utils/time.js';
import { scrubberMarks, timeAtFraction } from './scrubberModel.js';
import { usePlayback } from './usePlayback.js';
import s from './TimeScrubber.module.css';

const SPEED_OPTIONS = PLAY_SPEEDS_H.map((h) => ({ value: h, label: `${h} h/s` }));

/** The 7-day history plus live data on one track; drag to look back, play to watch it unfold. */
export function TimeScrubber() {
  const { data: site } = useSite();
  const now = useSiteNow().getTime();
  const { at, setAt, goLive, playing, setPlaying, playSpeedH, setPlaySpeed } = useTimeStore();
  const hour12 = useUiStore((st) => st.settings.hour12);
  const track = useRef(null);

  const start = site?.historyStartAt ? new Date(site.historyStartAt).getTime() : null;
  const end = now;
  // Data for the marks is fetched on an hourly window so it is not refetched every second.
  const fetchEnd = Math.ceil(end / HOUR_MS) * HOUR_MS;
  const { data: events } = useEvents(start, fetchEnd);
  const { data: alerts } = useAlerts({ limit: 300 });
  const { data: meshStates } = useMeshHistory(start, fetchEnd);
  usePlayback({ start, end });

  if (!start) return <div className={s.bar} />;
  const marks = scrubberMarks({ start, end, events, alerts, meshStates });
  const value = at ?? end;
  const f = (value - start) / (end - start);

  const setFromPointer = (clientX) => {
    const r = track.current.getBoundingClientRect();
    const frac = (clientX - r.left) / r.width;
    if (frac >= 0.995) goLive();
    else setAt(timeAtFraction(frac, start, end));
  };
  const onKeyDown = (e) => {
    const step = (e.shiftKey ? 6 : 1) * HOUR_MS;
    if (e.key === 'ArrowLeft') setAt(Math.max(start, value - step));
    else if (e.key === 'ArrowRight') value + step >= end ? goLive() : setAt(value + step);
    else if (e.key === 'End') goLive();
    else if (e.key === 'Home') setAt(start);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={s.bar} aria-label="Time">
      <div className={s.controls}>
        <IconButton
          icon={playing ? Pause : Play}
          label={playing ? 'Pause (Space)' : 'Play (Space)'}
          onClick={() => setPlaying(!playing)}
        />
        <SegmentedControl
          label="Playback speed"
          options={SPEED_OPTIONS}
          value={playSpeedH}
          onChange={setPlaySpeed}
        />
      </div>
      <Button
        size="small"
        variant={at == null ? 'quiet' : 'default'}
        active={at == null}
        onClick={goLive}
        title="Back to live"
      >
        Live
      </Button>
      <div
        ref={track}
        className={s.track}
        role="slider"
        tabIndex={0}
        aria-label="Time shown"
        aria-valuemin={start}
        aria-valuemax={end}
        aria-valuenow={value}
        aria-valuetext={at == null ? 'Live' : formatDateTime(value, { hour12 })}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setPlaying(false);
          setFromPointer(e.clientX);
        }}
        onPointerMove={(e) => e.buttons === 1 && setFromPointer(e.clientX)}
      >
        <div className={s.rail} />
        {marks.degraded.map((d) => (
          <div
            key={d.x0}
            className={s.degraded}
            style={{ left: `${d.x0 * 100}%`, width: `${(d.x1 - d.x0) * 100}%` }}
            title={d.reason}
          />
        ))}
        {marks.blasts.map((b) => (
          <div key={b.id} className={s.blast} style={{ left: `${b.x * 100}%` }} title="Blast" />
        ))}
        {marks.alerts.map((a) => (
          <span
            key={a.id}
            className={s.alert}
            style={{ left: `${a.x * 100}%`, color: `var(--tier-${a.tier})` }}
            title={a.title}
          >
            {TIER_SHAPES[a.tier]}
          </span>
        ))}
        <div
          className={s.handle}
          style={{ left: `${Math.min(1, Math.max(0, f)) * 100}%` }}
          aria-hidden
        />
      </div>
      <span className={`${s.time} ${at == null ? s.live : ''}`}>
        {at == null
          ? `Live · ${formatDateTime(end, { hour12 })}`
          : formatDateTime(value, { hour12 })}
      </span>
    </div>
  );
}
