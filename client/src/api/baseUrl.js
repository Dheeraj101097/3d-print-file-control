/**
 * Centralized API base URL logic.
 * Detects if a VITE_API_URL is provided (production) or falls back to /api (local dev via proxy).
 */
const getBaseUrl = (suffix = '') => {
  const root = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : '/api';
  return suffix ? `${root}${suffix}` : root;
};

export default getBaseUrl;
