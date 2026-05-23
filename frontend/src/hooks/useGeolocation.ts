/**
 * Browser geolocation hook with privacy-safe permission flow.
 * Provides lat/lon for weather-aware disease intelligence.
 * 
 * Flow: Request permission → Get coordinates → Cache result
 * Fallback: Manual selection → Regional defaults
 */
import { useState, useCallback, useEffect } from 'react';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationName?: string;
}

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error' | 'manual';

// Regional fallback coordinates for Indian regions
const REGION_COORDINATES: Record<string, GeoLocation> = {
  'North India':   { latitude: 28.7041, longitude: 77.1025, locationName: 'North India' },
  'South India':   { latitude: 13.0827, longitude: 80.2707, locationName: 'South India' },
  'East India':    { latitude: 22.5726, longitude: 88.3639, locationName: 'East India' },
  'West India':    { latitude: 19.0760, longitude: 72.8777, locationName: 'West India' },
  'Central India': { latitude: 23.2599, longitude: 77.4126, locationName: 'Central India' },
};

const CACHE_KEY = 'agricosmo-geolocation';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedGeo {
  location: GeoLocation;
  timestamp: number;
}

function getCachedLocation(): GeoLocation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedGeo = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.location;
    }
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore parse errors
  }
  return null;
}

function cacheLocation(location: GeoLocation): void {
  try {
    const cached: CachedGeo = { location, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(getCachedLocation());
  const [status, setStatus] = useState<GeoStatus>(getCachedLocation() ? 'granted' : 'idle');
  const [error, setError] = useState<string | null>(null);

  // Attempt to get browser geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geo: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(geo);
        setStatus('granted');
        cacheLocation(geo);
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err.message);
        setStatus('denied');
        setError(err.message);
        // Don't clear existing cached location on denial
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  // Set location manually from a region selection
  const setRegionFallback = useCallback((regionName: string) => {
    const fallback = REGION_COORDINATES[regionName];
    if (fallback) {
      setLocation(fallback);
      setStatus('manual');
      cacheLocation(fallback);
    }
  }, []);

  // Set arbitrary coordinates
  const setManualLocation = useCallback((lat: number, lon: number, name?: string) => {
    const geo: GeoLocation = { latitude: lat, longitude: lon, locationName: name };
    setLocation(geo);
    setStatus('manual');
    cacheLocation(geo);
  }, []);

  // Auto-request on mount if no cached location
  useEffect(() => {
    if (!location && status === 'idle') {
      requestLocation();
    }
  }, [location, requestLocation, status]);

  return {
    location,
    status,
    error,
    requestLocation,
    setRegionFallback,
    setManualLocation,
    isAvailable: location !== null,
  };
}
