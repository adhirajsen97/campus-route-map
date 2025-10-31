import { useMemo, useRef, useState } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { getCampusLatLngBounds, getMapsConfig } from '@/lib/mapsClient';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CAMPUS_PLACE_WHITELIST } from '@/data/placeWhitelist';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure Maps JS API (with Places) is loaded before rendering Autocomplete
  const mapsConfig = getMapsConfig();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: mapsConfig.apiKey,
    libraries: mapsConfig.libraries as any,
    mapIds: mapsConfig.mapId ? [mapsConfig.mapId] : undefined,
  });

  const campusBounds = useMemo(() => getCampusLatLngBounds(), []);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const onPlaceChanged = () => {
    if (!autocomplete) {
      return;
    }

    const place = autocomplete.getPlace();

    if (!place.place_id || !CAMPUS_PLACE_WHITELIST.has(place.place_id)) {
      setErrorMessage('That place is outside the supported campus locations.');
      resetInput();
      return;
    }

    if (!place.geometry?.location) {
      setErrorMessage("We could not determine that place's location. Please pick another suggestion.");
      resetInput();
      return;
    }

    setErrorMessage(null);
    onPlaceSelected?.(place);
  };

  const handleInputChange = () => {
    if (errorMessage) {
      setErrorMessage(null);
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
            bounds: campusBounds,
            strictBounds: true,
            fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          }}
        >
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="pl-10 bg-background text-foreground"
            onChange={handleInputChange}
            aria-invalid={errorMessage ? 'true' : 'false'}
            aria-describedby={errorMessage ? 'search-error' : undefined}
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
      {errorMessage && (
        <p id="search-error" className="mt-1 text-xs text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
