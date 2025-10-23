import { Marker, InfoWindow } from '@react-google-maps/api';
import { Building } from '@/lib/types';
import { useMapStore } from '@/lib/mapState';
import { Building2 } from 'lucide-react';

interface MarkerLayerProps {
  buildings: Building[];
}

export const MarkerLayer = ({ buildings }: MarkerLayerProps) => {
  const { selectedBuilding, setSelectedBuilding, showBuildings } = useMapStore();

  if (!showBuildings) return null;

  // TODO(api): Replace mock buildings with API call
  // const { data: buildings } = await fetch('/api/buildings');

  return (
    <>
      {buildings.map((building) => (
        <Marker
          key={building.id}
          position={{ lat: building.lat, lng: building.lng }}
          onClick={() => setSelectedBuilding(building)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#1d7ce3',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }}
        />
      ))}

      {selectedBuilding && (
        <InfoWindow
          position={{ lat: selectedBuilding.lat, lng: selectedBuilding.lng }}
          onCloseClick={() => setSelectedBuilding(undefined)}
        >
          <div className="p-2 max-w-xs">
            <div className="flex items-start gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">{selectedBuilding.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedBuilding.code}</p>
              </div>
            </div>
            {selectedBuilding.description && (
              <p className="text-sm text-foreground mb-2">{selectedBuilding.description}</p>
            )}
            {selectedBuilding.hours && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Hours:</span> {selectedBuilding.hours}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};
