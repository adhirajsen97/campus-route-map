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
