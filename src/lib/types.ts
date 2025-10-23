// Core domain types for Campus Navigator

export interface Building {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  description?: string;
  hours?: string;
  tags?: string[];
  imageUrl?: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  lat: number;
  lng: number;
  category: 'academic' | 'sports' | 'social' | 'career' | 'wellness';
  buildingId?: string;
}

export interface RouteResult {
  distance: string;
  duration: string;
  steps: RouteStep[];
  polyline: string;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';

export interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  selectedBuilding?: Building;
  showBuildings: boolean;
  showEvents: boolean;
}
