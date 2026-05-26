// Centralized Frontend Configuration Manager
// Resolves environment variables from Vite context with safe local development defaults.

export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'development';

export const API_URL = (() => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  // Standardize trailing slashes and version prefixes
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url += '/api/v1';
  }
  return url;
})();

export const API_ORIGIN = API_URL.replace(/\/api\/v\d+$/i, '');

// Supabase configuration (Public keys only)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ovyslpgporjjrhulijpb.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
