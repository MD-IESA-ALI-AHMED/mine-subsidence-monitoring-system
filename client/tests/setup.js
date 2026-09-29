import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

// jsdom has no matchMedia; the app uses it for the theme, reduced motion and layout breakpoints.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
  globalThis.matchMedia = window.matchMedia;
}
