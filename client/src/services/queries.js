import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

export const SITE_ID = import.meta.env.VITE_DEFAULT_SITE_ID || 'site-01';

const iso = (ms) => (ms == null ? undefined : new Date(ms).toISOString());
const get = (url, params) => api.get(url, { params }).then((r) => r.data);

export const keys = {
  me: ['me'],
  status: (s) => ['status', s],
  site: (s) => ['site', s],
  nodes: (s, at) => ['nodes', s, at ?? 'live'],
  zones: (s, at) => ['zones', s, at ?? 'live'],
  links: (s, at) => ['links', s, at ?? 'live'],
  terrain: (s, at, res) => ['terrain', s, at ?? 'live', res],
  alerts: (s, f) => ['alerts', s, f ?? {}],
  events: (s, from, to) => ['events', s, from, to],
  meshHistory: (s, from, to) => ['meshHistory', s, from, to],
  prediction: (s) => ['prediction', s],
  node: (id) => ['node', id],
  nodeReadings: (id, from, to, fields) => ['nodeReadings', id, from, to, fields],
  nodePredictions: (id) => ['nodePredictions', id],
  zoneHistory: (s, key) => ['zoneHistory', s, key],
};

export const useMe = () =>
  useQuery({
    queryKey: keys.me,
    queryFn: () => get('/auth/me').then((d) => d.user),
    retry: false,
    staleTime: Infinity,
  });

export const useStatus = (siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.status(siteId),
    queryFn: () => get('/system/status', { siteId }).then((d) => d.status),
  });

export const useSite = (siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.site(siteId),
    queryFn: () => get(`/sites/${siteId}`).then((d) => d.site),
    staleTime: Infinity,
  });

export const useNodes = (at, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.nodes(siteId, at),
    queryFn: () => get('/nodes', { siteId, at: iso(at) }).then((d) => d.nodes),
    placeholderData: keepPreviousData,
    staleTime: at ? Infinity : 30_000,
  });

export const useZones = (at, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.zones(siteId, at),
    queryFn: () => get('/zones', { siteId, at: iso(at) }).then((d) => d.zones),
    placeholderData: keepPreviousData,
    staleTime: at ? Infinity : 30_000,
  });

export const useLinks = (at, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.links(siteId, at),
    queryFn: () => get('/links', { siteId, at: iso(at) }),
    placeholderData: keepPreviousData,
    staleTime: at ? Infinity : 60_000,
  });

export const useTerrain = (at, res = 4, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.terrain(siteId, at, res),
    queryFn: () => get(`/sites/${siteId}/terrain`, { res, at: iso(at) }),
    placeholderData: keepPreviousData,
    staleTime: at ? Infinity : 20_000,
    refetchInterval: at ? false : 20_000,
  });

export const useAlerts = (filters = {}, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.alerts(siteId, filters),
    queryFn: () =>
      get('/alerts', {
        siteId,
        state: filters.state?.join(',') || undefined,
        tier: filters.tier?.join(',') || undefined,
        limit: filters.limit,
      }).then((d) => d.alerts),
  });

export const useEvents = (from, to, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.events(siteId, from, to),
    queryFn: () => get('/events', { siteId, from: iso(from), to: iso(to) }).then((d) => d.events),
    enabled: from != null && to != null,
    staleTime: 60_000,
  });

export const useMeshHistory = (from, to, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.meshHistory(siteId, from, to),
    queryFn: () =>
      get('/links/history', { siteId, from: iso(from), to: iso(to) }).then((d) => d.states),
    enabled: from != null && to != null,
    staleTime: 5 * 60_000,
  });

export const useSpeedHistory = (from, to, siteId = SITE_ID) =>
  useQuery({
    queryKey: ['speedHistory', siteId, from, to],
    queryFn: () =>
      get(`/sites/${siteId}/speed-history`, { from: iso(from), to: iso(to), step: 60 }),
    enabled: from != null && to != null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

export const useLatestPrediction = (siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.prediction(siteId),
    queryFn: () => get('/predictions/latest', { siteId }).then((d) => d.prediction),
  });

export const useNode = (id) =>
  useQuery({
    queryKey: keys.node(id),
    queryFn: () => get(`/nodes/${id}`).then((d) => d.node),
    enabled: Boolean(id),
  });

export const useNodeReadings = (id, from, to, fields) =>
  useQuery({
    queryKey: keys.nodeReadings(id, from, to, fields),
    queryFn: () =>
      get(`/nodes/${id}/readings`, { from: iso(from), to: iso(to), fields: fields.join(',') }),
    enabled: Boolean(id) && from != null && to != null,
    placeholderData: keepPreviousData,
  });

export const useNodePredictions = (id) =>
  useQuery({
    queryKey: keys.nodePredictions(id),
    queryFn: () => get(`/predictions/node/${id}`, { limit: 1 }).then((d) => d.predictions),
    enabled: Boolean(id),
  });

export const useZoneHistory = (zoneKey, siteId = SITE_ID) =>
  useQuery({
    queryKey: keys.zoneHistory(siteId, zoneKey),
    queryFn: () => get(`/zones/${zoneKey}/history`, { siteId }).then((d) => d.history),
    enabled: Boolean(zoneKey),
  });

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/auth/login', body).then((r) => r.data.user),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => qc.clear(),
  });
}

function useAlertAction(action) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }) =>
      api.post(`/alerts/${id}/${action}`, { note }).then((r) => r.data.alert),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
export const useAcknowledge = () => useAlertAction('acknowledge');
export const useResolve = () => useAlertAction('resolve');
