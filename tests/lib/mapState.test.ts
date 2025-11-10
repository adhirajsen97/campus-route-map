import { describe, it, expect, beforeEach } from 'vitest';
import { useMapStore } from '@/lib/mapState';
import { MockMap } from '../mocks/googleMaps';

describe('mapState (Zustand store)', () => {
  beforeEach(() => {
    // Reset store before each test
    useMapStore.setState({
      center: { lat: 32.7311, lng: -97.1151 },
      zoom: 16,
      showEvents: true,
      mapInstance: null,
      hoveredStopId: null,
      selectedStopId: null,
      routeVisibility: useMapStore.getInitialState().routeVisibility,
    });
  });

  describe('initial state', () => {
    it('should have default center coordinates', () => {
      const state = useMapStore.getState();
      expect(state.center).toEqual({ lat: 32.7311, lng: -97.1151 });
    });

    it('should have default zoom level', () => {
      const state = useMapStore.getState();
      expect(state.zoom).toBe(16);
    });

    it('should have showEvents enabled by default', () => {
      const state = useMapStore.getState();
      expect(state.showEvents).toBe(true);
    });

    it('should have null mapInstance by default', () => {
      const state = useMapStore.getState();
      expect(state.mapInstance).toBeNull();
    });

    it('should have null stop IDs by default', () => {
      const state = useMapStore.getState();
      expect(state.hoveredStopId).toBeNull();
      expect(state.selectedStopId).toBeNull();
    });

    it('should have all routes visible by default', () => {
      const state = useMapStore.getState();
      const allVisible = Object.values(state.routeVisibility).every((v) => v === true);
      expect(allVisible).toBe(true);
    });
  });

  describe('setCenter()', () => {
    it('should update center coordinates', () => {
      const newCenter = { lat: 40.7128, lng: -74.006 };
      useMapStore.getState().setCenter(newCenter);

      const state = useMapStore.getState();
      expect(state.center).toEqual(newCenter);
    });

    it('should not mutate other state', () => {
      const initialZoom = useMapStore.getState().zoom;
      useMapStore.getState().setCenter({ lat: 40.7128, lng: -74.006 });

      const state = useMapStore.getState();
      expect(state.zoom).toBe(initialZoom);
    });
  });

  describe('setZoom()', () => {
    it('should update zoom level', () => {
      useMapStore.getState().setZoom(18);

      const state = useMapStore.getState();
      expect(state.zoom).toBe(18);
    });

    it('should accept different zoom levels', () => {
      useMapStore.getState().setZoom(10);
      expect(useMapStore.getState().zoom).toBe(10);

      useMapStore.getState().setZoom(20);
      expect(useMapStore.getState().zoom).toBe(20);
    });
  });

  describe('setMapInstance()', () => {
    it('should store map instance', () => {
      const mockMap = new MockMap();
      useMapStore.getState().setMapInstance(mockMap as unknown as google.maps.Map);

      const state = useMapStore.getState();
      expect(state.mapInstance).toBe(mockMap);
    });

    it('should allow setting null', () => {
      const mockMap = new MockMap();
      useMapStore.getState().setMapInstance(mockMap as unknown as google.maps.Map);
      useMapStore.getState().setMapInstance(null);

      const state = useMapStore.getState();
      expect(state.mapInstance).toBeNull();
    });
  });

  describe('toggleEvents()', () => {
    it('should toggle showEvents from true to false', () => {
      useMapStore.setState({ showEvents: true });
      useMapStore.getState().toggleEvents();

      const state = useMapStore.getState();
      expect(state.showEvents).toBe(false);
    });

    it('should toggle showEvents from false to true', () => {
      useMapStore.setState({ showEvents: false });
      useMapStore.getState().toggleEvents();

      const state = useMapStore.getState();
      expect(state.showEvents).toBe(true);
    });

    it('should toggle multiple times', () => {
      useMapStore.setState({ showEvents: true });

      useMapStore.getState().toggleEvents();
      expect(useMapStore.getState().showEvents).toBe(false);

      useMapStore.getState().toggleEvents();
      expect(useMapStore.getState().showEvents).toBe(true);

      useMapStore.getState().toggleEvents();
      expect(useMapStore.getState().showEvents).toBe(false);
    });
  });

  describe('setRouteVisibility()', () => {
    it('should set route visibility to true', () => {
      const routeCode = 'Black';
      useMapStore.getState().setRouteVisibility(routeCode, true);

      const state = useMapStore.getState();
      expect(state.routeVisibility[routeCode]).toBe(true);
    });

    it('should set route visibility to false', () => {
      const routeCode = 'Black';
      useMapStore.getState().setRouteVisibility(routeCode, false);

      const state = useMapStore.getState();
      expect(state.routeVisibility[routeCode]).toBe(false);
    });

    it('should not update if value is the same', () => {
      const routeCode = 'Black';
      const initialState = useMapStore.getState();
      const initialVisibility = initialState.routeVisibility[routeCode];

      useMapStore.getState().setRouteVisibility(routeCode, initialVisibility);

      // State object reference should remain the same
      const newState = useMapStore.getState();
      expect(newState.routeVisibility).toBe(initialState.routeVisibility);
    });

    it('should not affect other routes', () => {
      const state = useMapStore.getState();
      const initialVisibility = { ...state.routeVisibility };

      useMapStore.getState().setRouteVisibility('Black', false);

      const newState = useMapStore.getState();
      Object.keys(initialVisibility).forEach((code) => {
        if (code !== 'Black') {
          expect(newState.routeVisibility[code]).toBe(initialVisibility[code]);
        }
      });
    });

    it('should clear stop selections when all routes become invisible', () => {
      useMapStore.setState({
        hoveredStopId: 'stop-1',
        selectedStopId: 'stop-2',
      });

      // Disable all routes
      const routes = Object.keys(useMapStore.getState().routeVisibility);
      routes.forEach((code) => {
        useMapStore.getState().setRouteVisibility(code, false);
      });

      const state = useMapStore.getState();
      expect(state.hoveredStopId).toBeNull();
      expect(state.selectedStopId).toBeNull();
    });
  });

  describe('toggleRouteVisibility()', () => {
    it('should toggle route from visible to hidden', () => {
      const routeCode = 'Black';
      useMapStore.setState({
        routeVisibility: {
          ...useMapStore.getState().routeVisibility,
          [routeCode]: true,
        },
      });

      useMapStore.getState().toggleRouteVisibility(routeCode);

      const state = useMapStore.getState();
      expect(state.routeVisibility[routeCode]).toBe(false);
    });

    it('should toggle route from hidden to visible', () => {
      const routeCode = 'Black';
      useMapStore.setState({
        routeVisibility: {
          ...useMapStore.getState().routeVisibility,
          [routeCode]: false,
        },
      });

      useMapStore.getState().toggleRouteVisibility(routeCode);

      const state = useMapStore.getState();
      expect(state.routeVisibility[routeCode]).toBe(true);
    });
  });

  describe('enableAllRoutes()', () => {
    it('should set all routes to visible', () => {
      // First disable some routes
      useMapStore.setState({
        routeVisibility: {
          Black: false,
          Blue: false,
          Green: true,
        },
      });

      useMapStore.getState().enableAllRoutes();

      const state = useMapStore.getState();
      const allVisible = Object.values(state.routeVisibility).every((v) => v === true);
      expect(allVisible).toBe(true);
    });

    it('should not update if all routes already visible', () => {
      const initialState = useMapStore.getState();
      useMapStore.getState().enableAllRoutes();

      const newState = useMapStore.getState();
      expect(newState.routeVisibility).toBe(initialState.routeVisibility);
    });
  });

  describe('disableAllRoutes()', () => {
    it('should set all routes to hidden', () => {
      useMapStore.getState().disableAllRoutes();

      const state = useMapStore.getState();
      const allHidden = Object.values(state.routeVisibility).every((v) => v === false);
      expect(allHidden).toBe(true);
    });

    it('should clear hovered stop ID', () => {
      useMapStore.setState({ hoveredStopId: 'stop-1' });
      useMapStore.getState().disableAllRoutes();

      const state = useMapStore.getState();
      expect(state.hoveredStopId).toBeNull();
    });

    it('should clear selected stop ID', () => {
      useMapStore.setState({ selectedStopId: 'stop-2' });
      useMapStore.getState().disableAllRoutes();

      const state = useMapStore.getState();
      expect(state.selectedStopId).toBeNull();
    });

    it('should not update if all routes already hidden', () => {
      useMapStore.getState().disableAllRoutes();
      const stateAfterFirst = useMapStore.getState();

      useMapStore.getState().disableAllRoutes();
      const stateAfterSecond = useMapStore.getState();

      expect(stateAfterSecond.routeVisibility).toBe(stateAfterFirst.routeVisibility);
    });
  });

  describe('setHoveredStopId()', () => {
    it('should set hovered stop ID', () => {
      useMapStore.getState().setHoveredStopId('stop-123');

      const state = useMapStore.getState();
      expect(state.hoveredStopId).toBe('stop-123');
    });

    it('should clear hovered stop ID with null', () => {
      useMapStore.setState({ hoveredStopId: 'stop-123' });
      useMapStore.getState().setHoveredStopId(null);

      const state = useMapStore.getState();
      expect(state.hoveredStopId).toBeNull();
    });

    it('should not update if value is the same', () => {
      useMapStore.setState({ hoveredStopId: 'stop-123' });
      const initialState = useMapStore.getState();

      useMapStore.getState().setHoveredStopId('stop-123');

      // State reference should remain the same
      const newState = useMapStore.getState();
      expect(newState).toBe(initialState);
    });
  });

  describe('setSelectedStopId()', () => {
    it('should set selected stop ID', () => {
      useMapStore.getState().setSelectedStopId('stop-456');

      const state = useMapStore.getState();
      expect(state.selectedStopId).toBe('stop-456');
    });

    it('should clear selected stop ID with null', () => {
      useMapStore.setState({ selectedStopId: 'stop-456' });
      useMapStore.getState().setSelectedStopId(null);

      const state = useMapStore.getState();
      expect(state.selectedStopId).toBeNull();
    });

    it('should not update if value is the same', () => {
      useMapStore.setState({ selectedStopId: 'stop-456' });
      const initialState = useMapStore.getState();

      useMapStore.getState().setSelectedStopId('stop-456');

      // State reference should remain the same
      const newState = useMapStore.getState();
      expect(newState).toBe(initialState);
    });
  });
});
