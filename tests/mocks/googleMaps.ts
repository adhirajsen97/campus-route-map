import { vi } from 'vitest';

// Mock Google Maps LatLng
export class MockLatLng {
  constructor(
    private _lat: number,
    private _lng: number
  ) {}

  lat() {
    return this._lat;
  }

  lng() {
    return this._lng;
  }

  toJSON() {
    return { lat: this._lat, lng: this._lng };
  }

  equals(other: google.maps.LatLng | google.maps.LatLngLiteral): boolean {
    if ('lat' in other && 'lng' in other) {
      return this._lat === other.lat && this._lng === other.lng;
    }
    return this._lat === other.lat() && this._lng === other.lng();
  }

  toUrlValue(precision?: number): string {
    const lat = precision ? this._lat.toFixed(precision) : this._lat;
    const lng = precision ? this._lng.toFixed(precision) : this._lng;
    return `${lat},${lng}`;
  }
}

// Types for mock parameters
interface MockDirectionsRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  travelMode?: string;
}

type DirectionsCallback = (result: google.maps.DirectionsResult, status: string) => void;

// Mock Google Maps DirectionsService
export class MockDirectionsService {
  route = vi.fn((request: MockDirectionsRequest, callback?: DirectionsCallback) => {
    const mockResult = {
      routes: [
        {
          legs: [
            {
              distance: { text: '1.2 km', value: 1200 },
              duration: { text: '15 mins', value: 900 },
              start_location: new MockLatLng(request.origin.lat, request.origin.lng),
              end_location: new MockLatLng(request.destination.lat, request.destination.lng),
              steps: [],
            },
          ],
        },
      ],
    } as unknown as google.maps.DirectionsResult;

    if (callback) {
      callback(mockResult, 'OK');
      return;
    }

    return Promise.resolve(mockResult);
  });
}

interface MockPlaceDetailsRequest {
  placeId: string;
}

type PlaceDetailsCallback = (result: google.maps.places.PlaceResult, status: string) => void;

// Mock Google Maps PlacesService
export class MockPlacesService {
  getDetails = vi.fn((request: MockPlaceDetailsRequest, callback: PlaceDetailsCallback) => {
    const mockPlace = {
      place_id: request.placeId,
      name: 'Test Place',
      formatted_address: '123 Test St',
      geometry: {
        location: new MockLatLng(32.7311, -97.1151),
      },
    } as unknown as google.maps.places.PlaceResult;
    callback(mockPlace, 'OK');
  });
}

// Mock Google Maps Autocomplete
export class MockAutocomplete {
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  addListener = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(handler);
    return { remove: vi.fn() };
  });

  getPlace = vi.fn(() => ({
    place_id: 'test-place-id',
    name: 'Test Location',
    formatted_address: '123 Test St, City, State',
    geometry: {
      location: new MockLatLng(32.7311, -97.1151),
    },
  }));

  setBounds = vi.fn();
  setFields = vi.fn();
}

// Mock Google Maps Map
export class MockMap {
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  panTo = vi.fn();
  setZoom = vi.fn();
  setCenter = vi.fn();
  fitBounds = vi.fn();
  getCenter = vi.fn(() => new MockLatLng(32.7311, -97.1151));
  getZoom = vi.fn(() => 16);

  addListener = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(handler);
    return { remove: vi.fn() };
  });
}

// Setup global Google Maps mock
export const setupGoogleMapsMock = () => {
  (globalThis as unknown as { google: typeof google }).google = {
    maps: {
      LatLng: MockLatLng,
      Map: MockMap,
      DirectionsService: MockDirectionsService,
      PlacesService: MockPlacesService,
      places: {
        Autocomplete: MockAutocomplete,
        PlacesService: MockPlacesService,
        PlacesServiceStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
        },
      },
      DirectionsStatus: {
        OK: 'OK',
        NOT_FOUND: 'NOT_FOUND',
        ZERO_RESULTS: 'ZERO_RESULTS',
      },
      TravelMode: {
        DRIVING: 'DRIVING',
        WALKING: 'WALKING',
        BICYCLING: 'BICYCLING',
        TRANSIT: 'TRANSIT',
      },
      LatLngBounds: vi.fn(),
    },
  } as unknown as typeof google;
};

// Cleanup Google Maps mock
export const cleanupGoogleMapsMock = () => {
  delete (globalThis as unknown as { google?: typeof google }).google;
};
