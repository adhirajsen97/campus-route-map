import { useMemo } from 'react';
import { Polygon } from '@react-google-maps/api';
import { CAMPUS_BOUNDARY_COORDINATES } from '@/data/campusBoundary';

const WORLD_OUTER_RING: google.maps.LatLngLiteral[] = [
  { lat: 85, lng: -180 },
  { lat: 85, lng: 180 },
  { lat: -85, lng: 180 },
  { lat: -85, lng: -180 },
  { lat: 85, lng: -180 },
];

export const CampusMask = () => {
  const campusHole = useMemo(() => {
    if (!CAMPUS_BOUNDARY_COORDINATES.length) {
      return [];
    }

    const coordinates = [...CAMPUS_BOUNDARY_COORDINATES];
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];

    if (firstPoint.lat !== lastPoint.lat || firstPoint.lng !== lastPoint.lng) {
      coordinates.push(firstPoint);
    }

    return coordinates.reverse();
  }, []);

  if (!campusHole.length) {
    return null;
  }

  return (
    <Polygon
      paths={[WORLD_OUTER_RING, campusHole]}
      options={{
        fillColor: '#020817',
        fillOpacity: 0,
        strokeOpacity: 0,
        clickable: false,
        zIndex: 1,
      }}
    />
  );
};
