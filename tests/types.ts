// Shared type definitions for test files

import { ReactNode } from 'react';

// Mock component prop types
export interface MockSearchAutocompleteProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  leadingIcon?: ReactNode;
  hideDefaultIcon?: boolean;
  className?: string;
  inputClassName?: string;
  defaultValue?: string;
  onClear?: () => void;
}

// Google Maps mock types
export interface MockAutocompleteOptions {
  onLoad?: (autocomplete: google.maps.places.Autocomplete) => void;
  onPlaceChanged?: () => void;
  children: ReactNode;
}

export interface MockPlaceResult {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
}
