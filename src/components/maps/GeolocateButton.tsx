import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crosshair, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMapStore } from '@/lib/mapState';

export const GeolocateButton = () => {
  const [isLocating, setIsLocating] = useState(false);
  const { setCenter, setZoom } = useMapStore();

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCenter({ lat: latitude, lng: longitude });
        setZoom(17);
        
        toast({
          title: 'Location found',
          description: 'Map centered on your current location',
        });
        
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: 'Location error',
          description: 'Unable to get your current location. Please check permissions.',
          variant: 'destructive',
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleGeolocate}
      disabled={isLocating}
      className="shadow-md bg-background hover:bg-accent"
      aria-label="Find my location"
    >
      {isLocating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Crosshair className="h-4 w-4" />
      )}
    </Button>
  );
};
