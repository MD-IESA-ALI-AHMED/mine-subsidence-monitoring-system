import { useNodePredictions, useNodeReadings, useSite } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { InlineError, SkeletonRows } from '../../ui/Panel.jsx';
import { HOUR_MS } from '../../utils/time.js';
import s from '../charts/Charts.module.css';
import { ForecastChart, forecastPoints } from './ForecastChart.jsx';

const STEP_MS = 10 * 60_000;
const FIELDS = ['sinking_mm'];

/**
 * Forecast for the zone's worst node. The limit applies to sinking beyond the Knothe prediction,
 * so on this chart of total sinking it sits at (expected + limit).
 */
export function ZoneForecast({ zone }) {
  const at = useTimeStore((st) => st.at);
  const now = useSiteNow();
  const { data: site } = useSite();
  const nodeId = zone.worstNodeId;
  const nowMs = at ?? Math.ceil(now.getTime() / STEP_MS) * STEP_MS;
  const readings = useNodeReadings(nodeId, nowMs - 48 * HOUR_MS, nowMs, FIELDS);
  const { data: predictions } = useNodePredictions(nodeId);

  if (readings.isError)
    return <InlineError message="Could not load the forecast." onRetry={readings.refetch} />;
  if (readings.isPending) return <SkeletonRows rows={5} />;

  const latest = at == null ? predictions?.[0] : null; // a forecast is only shown for "now"
  const limitSinking = site?.thresholds?.limitSinking_mm;
  const limit_mm = limitSinking != null ? (zone.knotheExpected_mm ?? 0) + limitSinking : null;
  return (
    <div>
      <p className={s.chartTitle}>
        <strong>{nodeId}</strong>
        <span>worst node · limit = expected + {limitSinking} mm</span>
      </p>
      <ForecastChart
        observed={{ t: readings.data.t, v: readings.data.values.sinking_mm }}
        forecast={latest ? forecastPoints(latest, latest.createdAt) : []}
        now={new Date(nowMs)}
        limit_mm={limit_mm}
        tCrit_h={zone.tCrit?.used_h}
        label={`Sinking forecast for ${nodeId}`}
      />
      {!latest && <p className={s.caption}>No forecast for this time.</p>}
    </div>
  );
}
