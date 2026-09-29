import axios from 'axios';

// Same-origin requests (Vite proxies /api), so the httpOnly SameSite=Strict cookies travel.
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20000 });

let refreshing = null;
let onAuthLost = () => {};

/** Called once by the app to decide what happens when the session cannot be refreshed. */
export function setAuthLostHandler(fn) {
  onAuthLost = fn;
}

/** One refresh at a time; parallel 401s wait for the same one. */
export function refreshSession() {
  refreshing ??= api.post('/auth/refresh', null, { _noRetry: true }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

const isAuthCall = (url = '') => /\/auth\/(login|refresh|logout)$/.test(url);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (
      response?.status !== 401 ||
      !config ||
      config._noRetry ||
      config._retried ||
      isAuthCall(config.url)
    ) {
      throw error;
    }
    try {
      await refreshSession();
    } catch (refreshError) {
      onAuthLost();
      throw refreshError;
    }
    return api({ ...config, _retried: true });
  },
);

/** "Email or password is incorrect" etc. from the server's { error: { message } } envelope. */
export function errorMessage(err, fallback = 'Something went wrong') {
  return (
    err?.response?.data?.error?.message ??
    (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server' : fallback)
  );
}
