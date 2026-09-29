import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS as E, batteryPct } from '@subsidence/shared';
import { keys, SITE_ID } from '../services/queries.js';
import { connectSocket } from '../services/socket.js';
import { useLiveStore } from '../store/liveStore.js';
import { useToastStore } from '../store/toastStore.js';
import { useUiStore } from '../store/uiStore.js';
import { playCriticalTone } from '../utils/sound.js';

const asArray = (p) => (Array.isArray(p) ? p : [p]);

/** Patches the live node list in place from readings and status messages. */
function patchNodes(qc, patchById) {
  qc.setQueryData(keys.nodes(SITE_ID), (nodes) =>
    nodes?.map((n) => (patchById.has(n.id) ? { ...n, ...patchById.get(n.id)(n) } : n)),
  );
}

/** One socket for the signed-in session; server pushes go straight into the query cache. */
export function useLiveUpdates({ enabled, onAuthLost }) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;
    const live = useLiveStore.getState();
    const clock = setInterval(() => useLiveStore.getState().tick(), 1000);

    const handlers = {
      [E.READINGS_BATCH]: (payload) => {
        const batch = asArray(payload);
        const patch = new Map();
        let newest = 0;
        for (const r of batch) {
          const ts = new Date(r.ts).getTime();
          newest = Math.max(newest, ts);
          patch.set(r.nodeId, (n) => ({
            lastSeenAt: r.ts,
            status: n.status === 'offline' ? 'online' : n.status,
            rssi_dBm: r.rssi_dBm ?? n.rssi_dBm,
            battery:
              r.battery_mV != null
                ? { mV: r.battery_mV, pct: batteryPct(r.battery_mV) }
                : n.battery,
            latest:
              r.sinking_mm != null
                ? {
                    ...n.latest,
                    sinking_mm: r.sinking_mm,
                    speed_mmPerDay: r.speed_mmPerDay,
                    tiltX_urad: r.tiltX_urad,
                    tiltY_urad: r.tiltY_urad,
                  }
                : n.latest,
          }));
        }
        patchNodes(qc, patch);
        live.observeSiteTime(newest);
        live.addReports(batch.map((r) => r.nodeId));
      },
      [E.NODE_STATUS]: (payload) => {
        const patch = new Map(
          asArray(payload).map((s) => [
            s.nodeId,
            () => ({ status: s.status, ...(s.fastMode != null && { fastMode: s.fastMode }) }),
          ]),
        );
        patchNodes(qc, patch);
      },
      [E.SYSTEM_STATUS]: (status) => {
        qc.setQueryData(keys.status(SITE_ID), status);
        if (status.siteClock)
          live.observeSiteTime(new Date(status.siteClock).getTime(), status.simSpeed);
      },
      [E.ZONES_UPDATED]: (zones) => {
        qc.setQueryData(keys.zones(SITE_ID), zones);
        qc.invalidateQueries({ queryKey: ['zoneHistory'] });
        qc.invalidateQueries({ queryKey: keys.nodes(SITE_ID) });
      },
      [E.ALERT_NEW]: (payload) => {
        qc.invalidateQueries({ queryKey: ['alerts'] });
        for (const a of asArray(payload)) {
          if (a.tier !== 'warning' && a.tier !== 'critical') continue;
          useToastStore
            .getState()
            .push({ id: a._id, tier: a.tier, title: a.title, body: a.reason, zoneKey: a.zoneKey });
          if (a.tier === 'critical' && useUiStore.getState().settings.criticalSound)
            playCriticalTone();
        }
      },
      [E.ALERT_UPDATED]: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
      [E.EVENT_NEW]: () => qc.invalidateQueries({ queryKey: ['events'] }),
      [E.PREDICTION_NEW]: () => {
        qc.invalidateQueries({ queryKey: keys.prediction(SITE_ID) });
        qc.invalidateQueries({ queryKey: ['nodePredictions'] });
      },
      [E.MESH_TOPOLOGY]: () => qc.invalidateQueries({ queryKey: keys.links(SITE_ID) }),
    };

    const disconnect = connectSocket({
      siteId: SITE_ID,
      handlers,
      onState: live.setConn,
      onAuthLost,
    });
    return () => {
      clearInterval(clock);
      disconnect();
    };
  }, [enabled, qc, onAuthLost]);
}
