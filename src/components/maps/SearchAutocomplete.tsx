import { useRef, useEffect, useState } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { getMapsConfig } from '@/lib/mapsClient';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchAutocompleteProps {
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export const SearchAutocomplete = ({ 
  onPlaceSelected,
  placeholder = "Search campus locations...",
  className 
}: SearchAutocompleteProps) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure Maps JS API (with Places) is loaded before rendering Autocomplete
  const mapsConfig = getMapsConfig();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: mapsConfig.apiKey,
    libraries: mapsConfig.libraries as any,
    mapIds: mapsConfig.mapId ? [mapsConfig.mapId] : undefined,
  });

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      // TODO(api): Future integration point
      // When backend search API is ready, call it here:
      // const response = await fetch(`/api/search?q=${encodeURIComponent(place.name)}`);
      // const results = await response.json();
      
      onPlaceSelected?.(place);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      {isLoaded ? (
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          }}
        >
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="pl-10 bg-background text-foreground"
          />
        </Autocomplete>
      ) : (
        <Input
          ref={inputRef}
          type="text"
          placeholder="Loading Google Maps..."
          className="pl-10 bg-background text-foreground"
          disabled
          aria-disabled="true"
        />
      )}
    </div>
  );
};
