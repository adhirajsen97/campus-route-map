import { useState, useCallback } from 'react';
import { DirectionsRenderer, DirectionsService } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation, MapPin } from 'lucide-react';
import { TravelMode } from '@/lib/types';

export const DirectionsPanel = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('WALKING');
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      setDirectionsResponse(result);
      
      // TODO(api): Future integration - log route to analytics
      // await fetch('/api/routes/log', {
      //   method: 'POST',
      //   body: JSON.stringify({ origin, destination, mode: travelMode })
      // });
    } else {
      console.error('Directions request failed:', status);
    }
    setIsCalculating(false);
  }, []);

  const calculateRoute = () => {
    if (!origin || !destination) return;
    setIsCalculating(true);
  };

  const clearRoute = () => {
    setDirectionsResponse(null);
    setOrigin('');
    setDestination('');
  };

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
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Starting point..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination" className="text-sm font-medium">To</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination..."
              className="pl-10"
            />
          </div>
        </div>

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
          <Button 
            onClick={calculateRoute} 
            disabled={!origin || !destination || isCalculating}
            className="flex-1"
          >
            {isCalculating ? 'Calculating...' : 'Get Directions'}
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

      {/* DirectionsService triggers on origin/destination/mode change */}
      {origin && destination && isCalculating && (
        <DirectionsService
          options={{
            origin,
            destination,
            travelMode: travelMode as google.maps.TravelMode,
          }}
          callback={directionsCallback}
        />
      )}

      {/* DirectionsRenderer displays the route on the map */}
      {directionsResponse && (
        <DirectionsRenderer
          options={{
            directions: directionsResponse,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: '#1d7ce3',
              strokeWeight: 5,
            },
          }}
        />
      )}
    </Card>
  );
};
