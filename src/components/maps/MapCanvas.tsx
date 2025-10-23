import { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { getMapsConfig, DEFAULT_CENTER, DEFAULT_ZOOM, MAP_OPTIONS } from '@/lib/mapsClient';
import { Loader2 } from 'lucide-react';

interface MapCanvasProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  children?: React.ReactNode;
}

export const MapCanvas = ({ 
  center = DEFAULT_CENTER, 
  zoom = DEFAULT_ZOOM, 
  onMapReady,
  children 
}: MapCanvasProps) => {
  const mapsConfig = getMapsConfig();
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Check if API key is missing before trying to load
  if (!mapsConfig.apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-center max-w-md p-6">
          <p className="text-destructive font-medium mb-2">Google Maps API Key Missing</p>
          <p className="text-sm text-muted-foreground mb-4">
            Please add your Google Maps API key to continue.
          </p>
          <div className="bg-background rounded-lg p-4 text-left">
            <p className="text-xs font-mono mb-2">Create a .env.local file:</p>
            <code className="text-xs bg-muted p-2 rounded block">
              VITE_GOOGLE_MAPS_API_KEY=your_key_here
            </code>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            See SETUP_GUIDE.md for detailed instructions
          </p>
        </div>
      </div>
    );
  }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: mapsConfig.apiKey,
    libraries: mapsConfig.libraries as any,
    mapIds: mapsConfig.mapId ? [mapsConfig.mapId] : undefined,
  });

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    onMapReady?.(mapInstance);
  }, [onMapReady]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-destructive font-medium">Error loading map</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your Google Maps API key
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="h-full w-full"
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        ...MAP_OPTIONS,
        mapId: mapsConfig.mapId,
      }}
    >
      {children}
    </GoogleMap>
  );
};
