import { useState } from 'react';
import { MapCanvas } from '@/components/maps/MapCanvas';
import { SearchAutocomplete } from '@/components/maps/SearchAutocomplete';
import { DirectionsPanel } from '@/components/maps/DirectionsPanel';
import { MarkerLayer } from '@/components/maps/MarkerLayer';
import { BuildingFootprints } from '@/components/maps/BuildingFootprints';
import { GeolocateButton } from '@/components/maps/GeolocateButton';
import { LayersToggle } from '@/components/maps/LayersToggle';
import { BuildingInfoPanel } from '@/components/panels/BuildingInfoPanel';
import { mockBuildings } from '@/data/buildings.mock';
import { useMapStore } from '@/lib/mapState';
import { MapPin } from 'lucide-react';

const Index = () => {
  const { center, zoom, selectedBuilding, setSelectedBuilding, setCenter, setZoom } = useMapStore();
  const [showDirections, setShowDirections] = useState(false);

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCenter({ lat, lng });
      setZoom(17);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground shadow-primary z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-7 w-7" />
              <h1 className="text-2xl font-bold">Campus Navigator</h1>
            </div>
            <div className="flex-1 max-w-md">
              <SearchAutocomplete
                onPlaceSelected={handlePlaceSelected}
                placeholder="Search campus locations..."
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Map */}
        <div className="flex-1 relative">
          <MapCanvas center={center} zoom={zoom}>
            <BuildingFootprints />
            <MarkerLayer buildings={mockBuildings} />
          </MapCanvas>

          {/* Floating Controls - Bottom Left */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-3 z-10">
            <GeolocateButton />
          </div>

          {/* Floating Layers Toggle - Top Right */}
          <div className="absolute top-6 right-6 z-10">
            <LayersToggle />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-background border-l border-border overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Building Info Panel */}
            {selectedBuilding && (
              <BuildingInfoPanel
                building={selectedBuilding}
                onClose={() => setSelectedBuilding(undefined)}
              />
            )}

            {/* Directions Panel */}
            <DirectionsPanel />

            {/* Instructions */}
            {!selectedBuilding && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h3 className="font-semibold text-sm text-foreground">Quick Start</h3>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>• Search locations using the search bar</li>
                  <li>• Click building markers for details</li>
                  <li>• Use directions panel to plan routes</li>
                  <li>• Toggle layers to show/hide buildings & events</li>
                  <li>• Click the target icon to center on your location</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
