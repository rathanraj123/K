// Centralized Frontend Configuration Manager
// Resolves environment variables from Vite context with safe local development defaults.

export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'development';

export const API_URL = (() => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  // Standardize trailing slashes
  url = url.replace(/\/+$/, '');
  
  // Safe normalization: ensure there is at least one /api/v1 at the end if missing
  if (!/\/api\/v1/i.test(url)) {
    url += '/api/v1';
  }
  
  // Self-heal: collapse any duplicate /api/v1 patterns (e.g. /api/v1/api/v1) to a single /api/v1
  url = url.replace(/(\/api\/v1)+/gi, '/api/v1');
  
  return url;
})();

export const API_ORIGIN = API_URL.replace(/\/api\/v\d+$/i, '');

// Supabase configuration (Public keys only)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ovyslpgporjjrhulijpb.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
