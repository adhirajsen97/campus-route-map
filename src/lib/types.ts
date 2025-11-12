// Core domain types for MavPath

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
  lat?: number;
  lng?: number;
  category: "academic" | "sports" | "social" | "career" | "wellness";
  buildingId?: string;
  location?: string;
  url?: string;
  tags?: string[];
}

export interface ShuttleStop {
  id: string;
  name: string;
  sequence: number;
  lat: number;
  lng: number;
  address?: string;
  isTransferHub: boolean;
  transfersTo: string[];
  departurePattern?: string;
  departureTimes?: string[];
  notes?: string;
}

export interface ShuttleRoute {
  code: string;
  name: string;
  color: string;
  service: {
    label: string;
    days: string;
    timeZone: string;
    start: string;
    end: string;
  };
  stops: ShuttleStop[];
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

export type TravelMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";

export interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  showEvents: boolean;
  routeVisibility: Record<string, boolean>;
  mapInstance: google.maps.Map | null;
  hoveredStopId: string | null;
  selectedStopId: string | null;
}
