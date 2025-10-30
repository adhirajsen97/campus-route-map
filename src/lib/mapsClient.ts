// Google Maps API client utilities

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

// UTA Campus boundaries (approximate)
// These coordinates define a rectangle around the main UTA campus
export const UTA_BOUNDS = {
  north: 32.7380,  // Northern edge near I-30
  south: 32.7240,  // Southern edge near Park Row
  east: -97.1080,  // Eastern edge near Cooper St
  west: -97.1220,  // Western edge near Davis St
};

// Map styling options
export const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: true,
  maxZoom: 20, // Allow close-up details
};
