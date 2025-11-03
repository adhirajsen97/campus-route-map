import { ChangeEvent, ReactNode, useMemo, useRef, useState } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { getCampusLatLngBounds, getMapsConfig } from '@/lib/mapsClient';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CAMPUS_PLACE_WHITELIST } from '@/data/placeWhitelist';

interface SearchAutocompleteProps {
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  leadingIcon?: ReactNode;
  hideDefaultIcon?: boolean;
  inputClassName?: string;
}

export const SearchAutocomplete = ({
  onPlaceSelected,
  placeholder = "Search campus locations...",
  className,
  value,
  defaultValue = '',
  onValueChange,
  onClear,
  leadingIcon,
  hideDefaultIcon,
  inputClassName,
}: SearchAutocompleteProps) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : internalValue;

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
    if (!isControlled) {
      setInternalValue('');
    }
    onValueChange?.('');
    onClear?.();
  };

  const isLocationWithinCampusBounds = (location: google.maps.LatLng) => {
    const lat = location.lat();
    const lng = location.lng();

    return (
      lat <= campusBounds.north &&
      lat >= campusBounds.south &&
      lng >= campusBounds.west &&
      lng <= campusBounds.east
    );
  };

  const onPlaceChanged = () => {
    if (!autocomplete) {
      return;
    }

    const place = autocomplete.getPlace();

    if (!place.geometry?.location) {
      setErrorMessage("We could not determine that place's location. Please pick another suggestion.");
      resetInput();
      return;
    }

    const location = place.geometry.location;
    const isWhitelisted = Boolean(place.place_id && CAMPUS_PLACE_WHITELIST.has(place.place_id));
    const withinCampus = isLocationWithinCampusBounds(location);

    if (!isWhitelisted && !withinCampus) {
      setErrorMessage('That place is outside the supported campus locations.');
      resetInput();
      return;
    }

    setErrorMessage(null);
    const displayName = place.name && place.formatted_address
      ? `${place.name}, ${place.formatted_address}`
      : place.formatted_address || place.name || '';

    if (!isControlled) {
      setInternalValue(displayName);
    }
    onValueChange?.(displayName);
    onPlaceSelected?.(place);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (errorMessage) {
      setErrorMessage(null);
    }
    if (!isControlled) {
      setInternalValue(event.target.value);
    }
    onValueChange?.(event.target.value);
  };

  const leadingIconNode = leadingIcon
    ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center">
          {leadingIcon}
        </span>
      )
    : !hideDefaultIcon ? (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      ) : null;

  return (
    <div className={`relative ${className ?? ''}`}>
      {leadingIconNode}
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
            value={inputValue}
            className={`pl-10 bg-background text-foreground ${inputClassName ?? ''}`}
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
          className={`pl-10 bg-background text-foreground ${inputClassName ?? ''}`}
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
