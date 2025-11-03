// Google Maps API client utilities

import { CAMPUS_BOUNDARY_COORDINATES } from '@/data/campusBoundary';

export interface MapsConfig {
  apiKey: string;
  mapId?: string;
  libraries: string[];
}

export const getMapsConfig = (): MapsConfig => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('VITE_GOOGLE_MAPS_API_KEY is not set. Please add it to your .env.local file.');
  }

  return {
    apiKey: apiKey || '',
    mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
    libraries: ['places', 'geometry'],
  };
};

// Default map center (UTA Campus)
export const DEFAULT_CENTER = { lat: 32.7311, lng: -97.1151 };

export const DEFAULT_ZOOM = 16;

// Arlington city limits (approximate rectangle)
export const ARLINGTON_CITY_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 32.8000, // Slightly south of River Legacy Park
  south: 32.6600, // North of the Mansfield city line
  east: -96.9500, // West of the Grand Prairie city line
  west: -97.2000, // East of Lake Viridian and Arlington Highlands
};

// UTA Campus boundaries (approximate)
// These coordinates define a rectangle around the main UTA campus
export const UTA_BOUNDS = {
  north: 32.7380,  // Northern edge near I-30
  south: 32.7240,  // Southern edge near Park Row
  east: -97.1080,  // Eastern edge near Cooper St
  west: -97.1220,  // Western edge near Davis St
};

export const getCampusLatLngBounds = (): google.maps.LatLngBoundsLiteral => {
  if (!CAMPUS_BOUNDARY_COORDINATES.length) {
    return UTA_BOUNDS;
  }

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const point of CAMPUS_BOUNDARY_COORDINATES) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  }

  return { north, south, east, west };
};

// Map styling options
export const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: true,
  minZoom: 11, // Keep view focused on Arlington
  maxZoom: 20, // Allow close-up details
  restriction: {
    latLngBounds: ARLINGTON_CITY_BOUNDS,
    strictBounds: false,
  },
};
