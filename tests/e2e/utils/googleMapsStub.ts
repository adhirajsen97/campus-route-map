export const googleMapsStub = `
(() => {
  const listeners = new WeakMap();

  const getListeners = (target) => {
    if (!listeners.has(target)) {
      listeners.set(target, new Map());
    }
    return listeners.get(target);
  };

  class MapsEventListener {
    constructor(target, eventName, handler) {
      this.target = target;
      this.eventName = eventName;
      this.handler = handler;
    }

    remove() {
      const registry = getListeners(this.target);
      const handlers = registry.get(this.eventName);
      if (!handlers) return;
      const index = handlers.indexOf(this.handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  class EventTarget {
    addListener(eventName, handler) {
      const registry = getListeners(this);
      const handlers = registry.get(eventName) ?? [];
      handlers.push(handler);
      registry.set(eventName, handlers);
      return new MapsEventListener(this, eventName, handler);
    }

    _emit(eventName, ...args) {
      const handlers = getListeners(this).get(eventName);
      if (!handlers) return;
      [...handlers].forEach((handler) => handler(...args));
    }
  }

  class LatLng {
    constructor(lat, lng) {
      this._lat = lat;
      this._lng = lng;
    }

    lat() {
      return this._lat;
    }

    lng() {
      return this._lng;
    }

    equals(other) {
      if (!other) return false;
      const lat = typeof other.lat === 'function' ? other.lat() : other.lat;
      const lng = typeof other.lng === 'function' ? other.lng() : other.lng;
      return lat === this._lat && lng === this._lng;
    }
  }

  class LatLngBounds {
    constructor(sw, ne) {
      this.southWest = sw ?? new LatLng(0, 0);
      this.northEast = ne ?? new LatLng(0, 0);
    }

    getSouthWest() {
      return this.southWest;
    }

    getNorthEast() {
      return this.northEast;
    }
  }

  class Size {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
  }

  class MVCObject extends EventTarget {}

  const mapsState = {
    autocompletes: [],
    maps: [],
    markers: [],
    polylines: [],
    polygons: [],
    nextDirectionsResponse: undefined,
    lastDirectionsRequest: null,
    placeDetails: Object.create(null),
    reset() {
      this.autocompletes = [];
      this.maps = [];
      this.markers = [];
      this.polylines = [];
      this.polygons = [];
      this.nextDirectionsResponse = undefined;
      this.lastDirectionsRequest = null;
      this.placeDetails = Object.create(null);
    },
  };

  const defaultDirectionsResponse = (request) => ({
    routes: [
      {
        legs: [
          {
            start_location: new LatLng(request.origin?.lat ?? 32.73, request.origin?.lng ?? -97.11),
            end_location: new LatLng(request.destination?.lat ?? 32.73, request.destination?.lng ?? -97.11),
            distance: { text: '1.2 mi', value: 1931 },
            duration: { text: '18 mins', value: 1080 },
            steps: [],
          },
        ],
      },
    ],
  });

  class Map extends EventTarget {
    constructor(element, options = {}) {
      super();
      this.element = element;
      this.options = options;
      this._center = options.center ? new LatLng(options.center.lat, options.center.lng) : new LatLng(32.73, -97.11);
      this._zoom = options.zoom ?? 16;
      mapsState.maps.push(this);
    }

    setOptions(options) {
      this.options = { ...this.options, ...options };
    }

    setCenter(center) {
      if (center) {
        this._center = new LatLng(center.lat, center.lng);
      }
    }

    getCenter() {
      return this._center;
    }

    panTo(center) {
      this.setCenter(center);
    }

    setZoom(zoom) {
      this._zoom = zoom;
    }

    getZoom() {
      return this._zoom;
    }

    fitBounds() {}
  }

  class Marker extends EventTarget {
    constructor(options = {}) {
      super();
      this._map = null;
      this.options = options;
      this.position = options.position ?? null;
      mapsState.markers.push(this);
      if (options.map) {
        this.setMap(options.map);
      }
    }

    setMap(map) {
      this._map = map;
    }

    getMap() {
      return this._map;
    }
  }

  class Polyline extends EventTarget {
    constructor(options = {}) {
      super();
      this._map = null;
      mapsState.polylines.push(this);
      if (options.map) {
        this.setMap(options.map);
      }
    }

    setMap(map) {
      this._map = map;
    }

    getMap() {
      return this._map;
    }

    setOptions() {}
  }

  class Polygon extends EventTarget {
    constructor(options = {}) {
      super();
      this._map = null;
      mapsState.polygons.push(this);
      if (options.map) {
        this.setMap(options.map);
      }
    }

    setMap(map) {
      this._map = map;
    }

    getMap() {
      return this._map;
    }

    setOptions() {}
  }

  class InfoWindow extends EventTarget {
    constructor(options = {}) {
      super();
      this._content = options.content ?? '';
      this._map = null;
      this._anchor = null;
    }

    setContent(content) {
      this._content = content;
    }

    open({ anchor, map } = {}) {
      this._anchor = anchor ?? null;
      this._map = map ?? null;
    }

    close() {
      this._map = null;
      this._anchor = null;
    }
  }

  class DirectionsRenderer extends EventTarget {
    constructor(options = {}) {
      super();
      this._map = null;
      this._directions = options.directions ?? null;
      if (options.map) {
        this.setMap(options.map);
      }
    }

    setMap(map) {
      this._map = map;
    }

    setDirections(directions) {
      this._directions = directions;
    }

    getDirections() {
      return this._directions;
    }

    setOptions() {}
  }

  class DirectionsService {
    route(request, callback) {
      mapsState.lastDirectionsRequest = request;
      const response = mapsState.nextDirectionsResponse ?? defaultDirectionsResponse(request);
      return new Promise((resolve) => {
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback(response, 'OK');
            resolve(undefined);
          } else {
            resolve(response);
          }
        }, 20);
      });
    }
  }

  const createPlace = (partial) => {
    const location = partial?.geometry?.location;
    const lat = typeof location?.lat === 'function' ? location.lat() : location?.lat ?? 32.7311;
    const lng = typeof location?.lng === 'function' ? location.lng() : location?.lng ?? -97.1151;

    return {
      place_id: partial?.place_id ?? 'mock-place-id',
      name: partial?.name ?? 'Mock Place',
      formatted_address: partial?.formatted_address ?? '701 S Nedderman Dr, Arlington, TX 76019',
      geometry: {
        location: new LatLng(lat, lng),
      },
    };
  };

  class Autocomplete extends EventTarget {
    constructor() {
      super();
      this._place = createPlace();
      mapsState.autocompletes.push(this);
    }

    getPlace() {
      return this._place;
    }

    setBounds() {}

    setFields() {}

    __setPlace(place) {
      this._place = createPlace(place);
      this._emit('place_changed');
    }
  }

  class PlacesService {
    constructor() {}

    getDetails(request, callback) {
      const place = mapsState.placeDetails[request.placeId] ?? createPlace({ place_id: request.placeId });
      callback(place, 'OK');
    }
  }

  const google = {
    maps: {
      Map,
      Marker,
      Polyline,
      Polygon,
      InfoWindow,
      DirectionsRenderer,
      DirectionsService,
      LatLng,
      LatLngBounds,
      Size,
      MVCObject,
      event: {
        addListener(target, eventName, handler) {
          return target.addListener(eventName, handler);
        },
        removeListener(listener) {
          if (listener && typeof listener.remove === 'function') {
            listener.remove();
          }
        },
      },
      SymbolPath: {
        CIRCLE: 'CIRCLE',
        BACKWARD_CLOSED_ARROW: 'BACKWARD_CLOSED_ARROW',
        FORWARD_CLOSED_ARROW: 'FORWARD_CLOSED_ARROW',
      },
      TravelMode: {
        DRIVING: 'DRIVING',
        WALKING: 'WALKING',
        BICYCLING: 'BICYCLING',
        TRANSIT: 'TRANSIT',
      },
      DirectionsStatus: {
        OK: 'OK',
        ZERO_RESULTS: 'ZERO_RESULTS',
        NOT_FOUND: 'NOT_FOUND',
      },
      geometry: {
        encoding: {
          decodePath: () => [],
        },
      },
      places: {
        Autocomplete,
        PlacesService,
        PlacesServiceStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
        },
      },
    },
  };

  const importLibrary = async (name) => {
    switch (name) {
      case 'core':
        return {
          Map,
          Marker,
          Polyline,
          Polygon,
          InfoWindow,
          DirectionsRenderer,
          DirectionsService,
          LatLng,
          LatLngBounds,
          Size,
          MVCObject,
          event: google.maps.event,
        };
      case 'places':
        return {
          Autocomplete,
          PlacesService,
          PlacesServiceStatus: google.maps.places.PlacesServiceStatus,
        };
      case 'geometry':
        return {
          encoding: google.maps.geometry.encoding,
        };
      case 'marker':
        return {};
      default:
        return {};
    }
  };

  google.maps.importLibrary = (name) => importLibrary(name);

  Object.defineProperty(window, '__googleMapsMock', {
    configurable: true,
    get() {
      return mapsState;
    },
  });

  Object.defineProperty(window, 'google', {
    configurable: true,
    get() {
      return google;
    },
    set() {},
  });

  mapsState.reset();

  window.__triggerAutocomplete = (index, place) => {
    const target = mapsState.autocompletes[index];
    if (!target) {
      throw new Error('No autocomplete registered at index ' + index);
    }
    target.__setPlace(place);
  };

  window.__setMockDirectionsResponse = (response) => {
    mapsState.nextDirectionsResponse = response;
  };

  const invokeCallback = (callbackName) => {
    if (!callbackName) return;
    const segments = callbackName.split('.');
    let target = window;
    for (const segment of segments) {
      if (!target) return;
      target = target[segment];
    }
    if (typeof target === 'function') {
      try {
        target();
      } catch (error) {
        console.error('googleMapsStub callback error', error);
      }
    }
  };

  const runCallbacks = () => {
    const currentScript = document.currentScript;
    if (currentScript) {
      try {
        const url = new URL(currentScript.src);
        invokeCallback(url.searchParams.get('callback'));
      } catch {
        // ignore failures parsing script URL
      }
    }

    if (google?.maps?.__ib__) {
      try {
        google.maps.__ib__();
      } catch (error) {
        console.error('googleMapsStub __ib__ error', error);
      }
    }

    ['__googleMapsCallback', 'googleMapsCallback', 'initMap'].forEach((name) => {
      const callback = window[name];
      if (typeof callback === 'function') {
        try {
          callback();
        } catch (error) {
          console.error('googleMapsStub callback error', error);
        }
      }
    });
  };

  setTimeout(runCallbacks, 0);
})();
`;
