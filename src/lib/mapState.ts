import { create } from 'zustand';
import { MapState } from './types';

interface MapStore extends MapState {
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setMapInstance: (map: google.maps.Map | null) => void;
  toggleEvents: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  center: { lat: 32.7311, lng: -97.1151 }, // UTA Campus center
  zoom: 16,
  showEvents: true,
  mapInstance: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setMapInstance: (map) => set({ mapInstance: map }),
  toggleEvents: () => set((state) => ({ showEvents: !state.showEvents })),
}));
