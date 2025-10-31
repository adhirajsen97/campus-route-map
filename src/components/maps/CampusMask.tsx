import { Polygon } from '@react-google-maps/api';
import { CAMPUS_BOUNDARY_COORDINATES } from '@/data/campusBoundary';

const WORLD_OUTER_RING: google.maps.LatLngLiteral[] = [
  { lat: 85, lng: -180 },
  { lat: 85, lng: 180 },
  { lat: -85, lng: 180 },
  { lat: -85, lng: -180 },
];

export const CampusMask = () => {
  // Reverse the campus coordinates to ensure the polygon is treated as a hole.
  const campusHole = [...CAMPUS_BOUNDARY_COORDINATES].reverse();

  return (
    <Polygon
      paths={[WORLD_OUTER_RING, campusHole]}
      options={{
        fillColor: '#020817',
        fillOpacity: 0.45,
        strokeOpacity: 0,
        clickable: false,
        zIndex: 1,
      }}
    />
  );
};
