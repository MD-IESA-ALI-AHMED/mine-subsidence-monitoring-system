import { create } from 'zustand';

/** Toasts are only raised for new warning and critical alerts; everything else goes to the feed. */
export const useToastStore = create((set, get) => ({
  toasts: [],
  pulseZone: null, // zone key whose rail row pulses once
  push: (toast) => {
    const id = toast.id ?? `${Date.now()}-${Math.random()}`;
    set({ toasts: [...get().toasts.filter((t) => t.id !== id), { ...toast, id }].slice(-3) });
    if (toast.zoneKey && toast.tier === 'critical') set({ pulseZone: toast.zoneKey });
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clearPulse: () => set({ pulseZone: null }),
}));
