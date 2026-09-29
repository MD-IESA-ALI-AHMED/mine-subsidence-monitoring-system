// Readiness: false until start-up (seed, history backfill, simulator) has finished.
let ready = false;

export const markReady = () => {
  ready = true;
};
export const isReady = () => ready;
