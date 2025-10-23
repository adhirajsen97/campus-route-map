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

// Default map center (San Francisco - can be customized)
export const DEFAULT_CENTER = {
  lat: 37.7749,
  lng: -122.4194,
};

export const DEFAULT_ZOOM = 15;

// Map styling options
export const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: true,
};
