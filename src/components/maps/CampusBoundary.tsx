import { Polygon } from '@react-google-maps/api';
import { CAMPUS_BOUNDARY_COORDINATES } from '@/data/campusBoundary';

/**
 * CampusBoundary - Shows the UTA campus boundary outline
 *
 * This component renders a polygon outline marking the approximate
 * boundaries of the UTA campus. The boundary follows major perimeter
 * streets and natural boundaries.
 */
export const CampusBoundary = () => {
  return (
    <Polygon
      paths={CAMPUS_BOUNDARY_COORDINATES}
      options={{
        fillColor: '#1d7ce3',
        fillOpacity: 0, // No fill - transparent interior
        strokeColor: '#1d7ce3', // University blue border
        strokeOpacity: 0.9,
        strokeWeight: 3,
        clickable: false,
        zIndex: 2,
      }}
    />
  );
};
