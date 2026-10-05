import axios from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 20000 });

/** "Email or password is incorrect" etc. from the server's { error: { message } } envelope. */
export function errorMessage(err, fallback = 'Something went wrong') {
  return (
    err?.response?.data?.error?.message ??
    (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server' : fallback)
  );
}
