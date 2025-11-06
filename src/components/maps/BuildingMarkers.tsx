import { useEffect, useRef } from 'react';
import { useMapStore } from '@/lib/mapState';

/**
 * BuildingMarkers - Uses Google Maps native POI system
 *
 * Listens for clicks on Google's built-in POI markers (like "UTA Tennis Center").
 * When clicked, uses the place_id from the click event to fetch full details.
 * Empty space clicks are ignored automatically.
 */
export const BuildingMarkers = () => {
  const { mapInstance: map } = useMapStore();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // Initialize Places service
    if (!placesServiceRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(map);
    }

    // Initialize InfoWindow (reuse single instance per best practices)
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Handle POI click with place details
    const handlePOIClick = (placeId: string, location: google.maps.LatLng) => {
      if (!placesServiceRef.current || !infoWindowRef.current) return;

      // Request full place details
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'opening_hours', 'geometry'],
      };

      placesServiceRef.current.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.name) {
          // Create marker at clicked location
          const marker = new google.maps.Marker({
            position: location,
            map: map,
            title: place.name,
          });

          markerRef.current = marker;

          // Build info window content with place details
          let content = '<div style="padding: 12px; max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">';

          // Building name (exact name from Google POI)
          content += `<h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #202124;">${place.name}</h3>`;

          // Address
          if (place.formatted_address) {
            content += `<p style="margin: 8px 0; font-size: 14px; color: #5f6368; line-height: 1.4;">${place.formatted_address}</p>`;
          }

          // Hours of operation
          if (place.opening_hours) {
            const isOpen = place.opening_hours.isOpen();
            const statusColor = isOpen ? '#188038' : '#d93025';
            const statusText = isOpen ? 'Open now' : 'Closed';

            content += `<div style="margin-top: 12px;">`;
            content += `<p style="margin: 4px 0; font-size: 14px; font-weight: 500; color: ${statusColor};">${statusText}</p>`;

            // Weekday hours
            if (place.opening_hours.weekday_text && place.opening_hours.weekday_text.length > 0) {
              content += `<ul style="margin: 8px 0; padding-left: 0; list-style: none; font-size: 13px; color: #5f6368;">`;
              place.opening_hours.weekday_text.forEach(day => {
                content += `<li style="margin: 2px 0;">${day}</li>`;
              });
              content += `</ul>`;
            }
            content += `</div>`;
          } else {
            content += `<p style="margin: 8px 0; font-size: 13px; color: #80868b;">Hours not available</p>`;
          }

          content += '</div>';

          infoWindowRef.current?.setContent(content);
          infoWindowRef.current?.open({
            anchor: marker,
            map: map,
          });
        }
      });
    };

    // Add click listener to map
    clickListenerRef.current = map.addListener('click', (event: google.maps.IconMouseEvent | google.maps.MapMouseEvent) => {
      // Check if this is a POI click (IconMouseEvent has placeId)
      const iconEvent = event as google.maps.IconMouseEvent;

      if (iconEvent.placeId) {
        // User clicked on a POI marker (e.g., "UTA Tennis Center")
        // Prevent default Google info window
        iconEvent.stop();

        // Remove previous marker if exists
        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }

        // Close previous info window
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        // Handle POI click with place_id from event
        if (event.latLng) {
          handlePOIClick(iconEvent.placeId, event.latLng);
        }
      }
      // If no placeId, ignore click (empty space/road)
    });

    // Cleanup function
    return () => {
      // Remove map click listener
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
      }

      // Remove marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      // Close info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [map]);

  return null;
};
