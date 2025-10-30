import { create } from 'zustand';
import { Building, MapState } from './types';

interface MapStore extends MapState {
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setSelectedBuilding: (building: Building | undefined) => void;
  toggleBuildings: () => void;
  toggleEvents: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  center: { lat: 32.7311, lng: -97.1151 }, // UTA Campus center
  zoom: 16,
  selectedBuilding: undefined,
  showBuildings: true,
  showEvents: true,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedBuilding: (building) => set({ selectedBuilding: building }),
  toggleBuildings: () => set((state) => ({ showBuildings: !state.showBuildings })),
  toggleEvents: () => set((state) => ({ showEvents: !state.showEvents })),
}));
