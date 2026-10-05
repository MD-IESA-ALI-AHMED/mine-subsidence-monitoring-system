import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { API_ORIGIN } from '../../services/api.js';
import { useEvents, useNodePredictions, useNodeReadings } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { useThemeTokens } from '../../hooks/useThemeTokens.js';
import { SegmentedControl } from '../../ui/Controls.jsx';
import { InlineError, SkeletonRows } from '../../ui/Panel.jsx';
import { HOUR_MS } from '../../utils/time.js';
import s from '../charts/Charts.module.css';
import { axis, cursorSync, line, timeAxis, tzDate } from '../charts/uplotTheme.js';
import { UPlotChart, eventTicksPlugin } from '../charts/UPlotChart.jsx';
import { buildNodeChartData } from './nodeChartData.js';

const RANGES = [
  { value: 24, label: '24 h' },
  { value: 72, label: '3 d' },
  { value: 168, label: '7 d' },
];
const FIELDS = ['sinking_mm', 'tiltX_urad', 'tiltY_urad', 'temp_C'];
const STEP_MS = 10 * 60_000;

function options({ tokens, series, bands, syncKey, events, onEvent, unit }) {
  return {
    tzDate,
    series: [{}, ...series],
    ...(bands && { bands }),
    axes: [timeAxis(tokens), axis(tokens, { label: unit })],
    scales: { x: { time: true } },
    cursor: cursorSync(syncKey),
    legend: { show: false },
    plugins: [eventTicksPlugin(events, tokens.textFaint, onEvent)],
  };
}

/** Three stacked charts on one time axis with a synced cursor: sinking (+ forecast), tilt, temperature. */
export function NodeCharts({ nodeId }) {
  const [rangeH, setRangeH] = useState(24);
  const [event, setEvent] = useState(null);
  const at = useTimeStore((st) => st.at);
  const now = useSiteNow();
  const tiltUnit = useUiStore((st) => st.settings.tiltUnit);
  const tokens = useThemeTokens();
  // The window end moves in 10-minute steps, so the query is not refetched every second.
  const to = Math.ceil((at ?? now.getTime()) / STEP_MS) * STEP_MS;
  const from = to - rangeH * HOUR_MS;
  const readings = useNodeReadings(nodeId, from, to, FIELDS);
  const { data: forecasts } = useNodePredictions(nodeId);
  const { data: events } = useEvents(from, to);

  const data = useMemo(
    () =>
      buildNodeChartData(
        readings.data,
        at == null ? forecasts?.[0] : null,
        (events ?? []).filter((e) => e.nodeIds?.includes(nodeId)),
        {
          tiltUnit,
        },
      ),
    [readings.data, forecasts, events, nodeId, tiltUnit, at],
  );

  const syncKey = `node-${nodeId}`;
  const tiltLabel = tiltUnit === 'deg' ? '°' : 'mm/m';
  const opts = useMemo(() => {
    const common = { tokens, syncKey, events: data.events, onEvent: setEvent };
    return {
      sinking: options({
        ...common,
        unit: 'mm',
        series: [
          line(tokens.text, { label: 'Sinking' }),
          line(tokens.tierWatch, { label: 'p90', width: 0 }),
          line(tokens.tierWatch, { label: 'Forecast', dash: [4, 3] }),
          line(tokens.tierWatch, { label: 'p10', width: 0 }),
        ],
        bands: [{ series: [2, 4], fill: `${tokens.tierWatch}26` }],
      }),
      tilt: options({
        ...common,
        unit: tiltLabel,
        series: [line(tokens.text, { label: 'Tilt x' }), line(tokens.accent, { label: 'Tilt y' })],
      }),
      temp: options({
        ...common,
        unit: '°C',
        series: [line(tokens.textMuted, { label: 'Temperature' })],
      }),
    };
  }, [tokens, syncKey, data.events, tiltLabel]);

  const exportHref = `${API_ORIGIN}/api/export/readings.csv?nodeIds=${nodeId}&from=${new Date(from).toISOString()}&to=${new Date(to).toISOString()}`;

  if (readings.isError)
    return <InlineError message="Could not load readings." onRetry={readings.refetch} />;
  return (
    <div>
      <div className={s.toolbar}>
        <SegmentedControl
          label="Chart range"
          options={RANGES}
          value={rangeH}
          onChange={setRangeH}
        />
        <a className={s.caption} href={exportHref} download style={{ color: 'var(--accent)' }}>
          <Download size={12} strokeWidth={1.5} aria-hidden /> Export CSV
        </a>
      </div>
      {readings.isPending ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          <p className={s.chartTitle}>
            <strong>Sinking</strong>
            {data.p50.some((v) => v != null) && <span>dashed: forecast, band: p10–p90</span>}
          </p>
          <UPlotChart
            options={opts.sinking}
            data={[data.x, data.sinking, data.p90, data.p50, data.p10]}
            height={130}
            label="Sinking over time"
          />
          <p className={s.chartTitle}>
            <strong>Tilt</strong>
            <span>
              <span style={{ color: 'var(--text)' }}>x</span> ·{' '}
              <span style={{ color: 'var(--accent)' }}>y</span>
            </span>
          </p>
          <UPlotChart
            options={opts.tilt}
            data={[data.x, data.tiltX, data.tiltY]}
            height={100}
            label="Tilt over time"
          />
          <p className={s.chartTitle}>
            <strong>Temperature</strong>
          </p>
          <UPlotChart
            options={opts.temp}
            data={[data.x, data.temp]}
            height={80}
            label="Box temperature over time"
          />
          <p className={s.eventCaption} aria-live="polite">
            {event
              ? `${event.label} at this time`
              : data.events.length
                ? 'Thin lines: blasts and other events'
                : ''}
          </p>
        </>
      )}
    </div>
  );
}
