import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation, MapPin } from 'lucide-react';
import { TravelMode } from '@/lib/types';
import { SearchAutocomplete } from '@/components/maps/SearchAutocomplete';

type PlaceSelection = {
  text: string;
  location: google.maps.LatLngLiteral | null;
  placeId?: string;
};

interface DirectionsPanelProps {
  directionsResponse: google.maps.DirectionsResult | null;
  onRouteComputed: (result: google.maps.DirectionsResult) => void;
  onRouteCleared: () => void;
}

export const DirectionsPanel = ({ directionsResponse, onRouteComputed, onRouteCleared }: DirectionsPanelProps) => {
  const [origin, setOrigin] = useState<PlaceSelection>({ text: '', location: null });
  const [destination, setDestination] = useState<PlaceSelection>({ text: '', location: null });
  const [travelMode, setTravelMode] = useState<TravelMode>('WALKING');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDestinationActive, setIsDestinationActive] = useState(false);
  const [originError, setOriginError] = useState<string | null>(null);
  const [lastRouteMode, setLastRouteMode] = useState<TravelMode | null>(null);

  const calculateRoute = useCallback(async () => {
    if (!origin.location || !destination.location) return;
    if (!window.google?.maps) {
      console.error('Google Maps API is not loaded.');
      return;
    }

    setIsCalculating(true);

    const service = new google.maps.DirectionsService();

    try {
      const result = await service.route({
        origin: origin.location,
        destination: destination.location,
        travelMode: travelMode as google.maps.TravelMode,
      });

      onRouteComputed(result);
      setLastRouteMode(travelMode);
    } catch (error) {
      console.error('Directions request failed:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [destination.location, onRouteComputed, origin.location, travelMode]);

  useEffect(() => {
    if (lastRouteMode === null) return;
    if (!isDestinationActive) return;
    if (!origin.location || !destination.location) return;
    if (travelMode === lastRouteMode) return;

    void calculateRoute();
  }, [calculateRoute, destination.location, isDestinationActive, lastRouteMode, origin.location, travelMode]);

  const clearRoute = () => {
    setOrigin({ text: '', location: null });
    setDestination({ text: '', location: null });
    setIsDestinationActive(false);
    setOriginError(null);
    setLastRouteMode(null);
    onRouteCleared();
  };

  const getPlaceDisplayName = (place: google.maps.places.PlaceResult) => {
    if (place.name && place.formatted_address) {
      return `${place.name}, ${place.formatted_address}`;
    }
    return place.formatted_address || place.name || '';
  };

  const handleOriginValueChange = (value: string) => {
    setOrigin({ text: value, location: null });
    setOriginError(null);
    if (value === '') {
      setIsDestinationActive(false);
      setDestination({ text: '', location: null });
    }
  };

  const handleDestinationValueChange = (value: string) => {
    setDestination({ text: value, location: null });
  };

  const handleOriginPlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (!place.geometry?.location) return;
    const location = place.geometry.location;
    setOrigin({
      text: getPlaceDisplayName(place),
      location: { lat: location.lat(), lng: location.lng() },
      placeId: place.place_id ?? undefined,
    });
    setOriginError(null);
  };

  const handleDestinationPlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (!place.geometry?.location) return;
    const location = place.geometry.location;
    setDestination({
      text: getPlaceDisplayName(place),
      location: { lat: location.lat(), lng: location.lng() },
      placeId: place.place_id ?? undefined,
    });
  };

  const handleGetDirectionsClick = () => {
    if (!isDestinationActive) {
      if (!origin.location) {
        setOriginError('Select a campus starting point before choosing a destination.');
        return;
      }

      setOriginError(null);
      setIsDestinationActive(true);
      return;
    }

    void calculateRoute();
  };

  const isGetDirectionsDisabled = !origin.location || (isDestinationActive && !destination.location) || isCalculating;

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="h-5 w-5 text-primary" />
          Get Directions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="origin" className="text-sm font-medium">From</Label>
          <SearchAutocomplete
            placeholder="Starting point..."
            value={origin.text}
            onValueChange={handleOriginValueChange}
            onPlaceSelected={handleOriginPlaceSelected}
            leadingIcon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            hideDefaultIcon
          />
          {originError && (
            <p className="text-xs text-destructive">{originError}</p>
          )}
        </div>

        {isDestinationActive && (
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-sm font-medium">To</Label>
            <SearchAutocomplete
              placeholder="Destination..."
              value={destination.text}
              onValueChange={handleDestinationValueChange}
              onPlaceSelected={handleDestinationPlaceSelected}
              leadingIcon={<MapPin className="h-4 w-4 text-accent" />}
              hideDefaultIcon
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="mode" className="text-sm font-medium">Travel Mode</Label>
          <Select value={travelMode} onValueChange={(value) => setTravelMode(value as TravelMode)}>
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WALKING">Walking</SelectItem>
              <SelectItem value="DRIVING">Driving</SelectItem>
              <SelectItem value="BICYCLING">Bicycling</SelectItem>
              <SelectItem value="TRANSIT">Transit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGetDirectionsClick} disabled={isGetDirectionsDisabled} className="flex-1">
            {isCalculating
              ? 'Calculating...'
              : isDestinationActive
                ? 'Get Directions'
                : 'Choose Destination'}
          </Button>
          {directionsResponse && (
            <Button variant="outline" onClick={clearRoute}>
              Clear
            </Button>
          )}
        </div>

        {directionsResponse && (
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="text-sm font-medium">Route Summary</div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Distance:</span>
                <span className="font-medium text-foreground">
                  {directionsResponse.routes[0]?.legs[0]?.distance?.text}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium text-foreground">
                  {directionsResponse.routes[0]?.legs[0]?.duration?.text}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
