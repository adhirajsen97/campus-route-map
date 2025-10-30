import { Polygon } from '@react-google-maps/api';

/**
 * CampusBoundary - Shows the UTA campus boundary outline
 *
 * This component renders a polygon outline marking the approximate
 * boundaries of the UTA campus. The boundary follows major perimeter
 * streets and natural boundaries.
 *
 * Boundaries based on:
 * - North: UTA Boulevard
 * - East: Center Street
 * - South: Trading House Creek area (irregular)
 * - West: Irregular boundary blending into city
 */
export const CampusBoundary = () => {
  // Campus boundary coordinates - approximating the irregular shape
  // Traced counter-clockwise starting from northwest corner
  const campusBounds = [
    // Northwest corner - UTA Blvd & West St
    { lat: 32.7380, lng: -97.1220 },

    // North edge - along UTA Boulevard
    { lat: 32.7380, lng: -97.1180 },
    { lat: 32.7380, lng: -97.1140 },
    { lat: 32.7380, lng: -97.1100 },

    // Northeast corner - UTA Blvd & Center St
    { lat: 32.7380, lng: -97.1080 },

    // East edge - along Center Street
    { lat: 32.7350, lng: -97.1080 },
    { lat: 32.7320, lng: -97.1080 },
    { lat: 32.7290, lng: -97.1080 },

    // Southeast corner - near Trading House Creek
    { lat: 32.7250, lng: -97.1090 },

    // South edge - irregular boundary along creek
    { lat: 32.7245, lng: -97.1120 },
    { lat: 32.7240, lng: -97.1150 },
    { lat: 32.7245, lng: -97.1180 },

    // Southwest corner
    { lat: 32.7250, lng: -97.1210 },

    // West edge - irregular boundary
    { lat: 32.7280, lng: -97.1220 },
    { lat: 32.7310, lng: -97.1220 },
    { lat: 32.7340, lng: -97.1220 },
  ];

  return (
    <Polygon
      paths={campusBounds}
      options={{
        fillColor: '#1d7ce3',
        fillOpacity: 0, // No fill - transparent interior
        strokeColor: '#1d7ce3', // University blue border
        strokeOpacity: 0.9,
        strokeWeight: 3,
        clickable: false,
        zIndex: 1,
      }}
    />
  );
};
