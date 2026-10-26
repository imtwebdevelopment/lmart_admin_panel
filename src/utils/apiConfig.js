const PRODUCTION_API_BASE = 'https://lmart-server-5lx6.onrender.com/api';
const configuredApiBase = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const isLoopbackApiBase = /^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/|$)/i.test(configuredApiBase || '');
const validConfiguredApiBase = configuredApiBase
  && (!import.meta.env.PROD || (configuredApiBase.startsWith('https://') && !isLoopbackApiBase));

if (import.meta.env.PROD && configuredApiBase && !validConfiguredApiBase) {
  console.error('Ignoring VITE_API_URL in production because it must be an HTTPS backend URL, not a loopback address.');
}

export const API_BASE = validConfiguredApiBase
  ? configuredApiBase
  : import.meta.env.DEV ? 'http://localhost:5000/api' : PRODUCTION_API_BASE;
