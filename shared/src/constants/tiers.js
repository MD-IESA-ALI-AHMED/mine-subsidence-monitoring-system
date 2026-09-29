// Alert tiers, in rising order. Order matters: index is the rank.
export const TIERS = Object.freeze(['normal', 'watch', 'warning', 'critical']);

export const TIER_RANK = Object.freeze(Object.fromEntries(TIERS.map((tier, rank) => [tier, rank])));

// Tiers are never shown by colour alone: each has a shape and a word.
export const TIER_SHAPES = Object.freeze({
  normal: '○',
  watch: '◇',
  warning: '△',
  critical: '■',
});

export const TIER_LABELS = Object.freeze({
  normal: 'Normal',
  watch: 'Watch',
  warning: 'Warning',
  critical: 'Critical',
});

export const NODE_STATUSES = Object.freeze(['online', 'offline', 'silent_after_rise']);

export const ALERT_STATES = Object.freeze(['open', 'acknowledged', 'resolved']);

export function tierRank(tier) {
  return TIER_RANK[tier] ?? -1;
}

export function maxTier(...tiers) {
  return tiers.reduce((best, t) => (tierRank(t) > tierRank(best) ? t : best), 'normal');
}

export function tierFromScore(score, cutoffs = { watch: 25, warning: 45, critical: 70 }) {
  if (score >= cutoffs.critical) return 'critical';
  if (score >= cutoffs.warning) return 'warning';
  if (score >= cutoffs.watch) return 'watch';
  return 'normal';
}
