import { create } from 'zustand';
import { shuttleRoutes } from '@/data/shuttleRoutes';
import { MapState } from './types';

interface MapStore extends MapState {
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setMapInstance: (map: google.maps.Map | null) => void;
  toggleEvents: () => void;
  toggleRouteVisibility: (routeCode: string) => void;
  setRouteVisibility: (routeCode: string, isVisible: boolean) => void;
  enableAllRoutes: () => void;
  disableAllRoutes: () => void;
  setHoveredStopId: (stopId: string | null) => void;
  setSelectedStopId: (stopId: string | null) => void;
}

const initialRouteVisibility = shuttleRoutes.reduce<Record<string, boolean>>(
  (acc, route) => {
    acc[route.code] = true;
    return acc;
  },
  {}
);

export const useMapStore = create<MapStore>((set, get) => ({
  center: { lat: 32.7311, lng: -97.1151 }, // UTA Campus center
  zoom: 16,
  showEvents: true,
  routeVisibility: initialRouteVisibility,
  mapInstance: null,
  hoveredStopId: null,
  selectedStopId: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setMapInstance: (map) => set({ mapInstance: map }),
  toggleEvents: () => set((state) => ({ showEvents: !state.showEvents })),
  toggleRouteVisibility: (routeCode) => {
    const current = get().routeVisibility[routeCode];
    get().setRouteVisibility(routeCode, !current);
  },
  setRouteVisibility: (routeCode, isVisible) =>
    set((state) => {
      if (state.routeVisibility[routeCode] === isVisible) {
        return state;
      }

      const routeVisibility = {
        ...state.routeVisibility,
        [routeCode]: isVisible,
      };

      const anyVisible = Object.values(routeVisibility).some(Boolean);
      const updates: Partial<MapStore> = { routeVisibility };

      if (!anyVisible) {
        if (state.hoveredStopId !== null) {
          updates.hoveredStopId = null;
        }

        if (state.selectedStopId !== null) {
          updates.selectedStopId = null;
        }
      }

      return updates;
    }),
  enableAllRoutes: () =>
    set((state) => {
      const allEnabled = Object.values(state.routeVisibility).every(Boolean);
      if (allEnabled) {
        return state;
      }

      const routeVisibility = Object.keys(state.routeVisibility).reduce<
        Record<string, boolean>
      >((acc, code) => {
        acc[code] = true;
        return acc;
      }, {});

      return { routeVisibility };
    }),
  disableAllRoutes: () =>
    set((state) => {
      const anyEnabled = Object.values(state.routeVisibility).some(Boolean);
      if (!anyEnabled) {
        return state;
      }

      const routeVisibility = Object.keys(state.routeVisibility).reduce<
        Record<string, boolean>
      >((acc, code) => {
        acc[code] = false;
        return acc;
      }, {});

      const updates: Partial<MapStore> = {
        routeVisibility,
      };

      if (state.hoveredStopId !== null) {
        updates.hoveredStopId = null;
      }

      if (state.selectedStopId !== null) {
        updates.selectedStopId = null;
      }

      return updates;
    }),
  setHoveredStopId: (stopId) =>
    set((state) =>
      state.hoveredStopId === stopId ? state : { hoveredStopId: stopId }
    ),
  setSelectedStopId: (stopId) =>
    set((state) =>
      state.selectedStopId === stopId ? state : { selectedStopId: stopId }
    ),
}));
