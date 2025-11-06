import { Polygon } from '@react-google-maps/api';
import { utaBuildings } from '@/data/uta-buildings';

/**
 * BuildingFootprints - Renders building footprints from GeoJSON data
 *
 * This component displays yellow/orange highlighted polygons for all
 * building structures on the UTA campus, similar to the official UTA map.
 */
export const BuildingFootprints = () => {

  return (
    <>
      {utaBuildings.features.map((feature, index) => {
        if (feature.geometry.type !== 'Polygon') {
          return null;
        }

        // Convert GeoJSON coordinates [lng, lat] to Google Maps format {lat, lng}
        const paths = feature.geometry.coordinates[0].map(([lng, lat]: number[]) => ({
          lat,
          lng,
        }));

        return (
          <Polygon
            key={feature.properties.OBJECTID || `building-${index}`}
            paths={paths}
            options={{
              fillColor: '#FFB74D', // Orange/yellow fill like UTA official map
              fillOpacity: 0.6,
              strokeColor: '#F57C00', // Darker orange border
              strokeOpacity: 0.8,
              strokeWeight: 1,
              clickable: false,
              zIndex: 2, // Above campus boundary but below markers
            }}
          />
        );
      })}
    </>
  );
};
