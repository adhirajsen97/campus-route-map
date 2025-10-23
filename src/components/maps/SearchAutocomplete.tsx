import { useRef, useEffect, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
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
          className="pl-10 bg-background"
        />
      </Autocomplete>
    </div>
  );
};
