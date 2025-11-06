import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useMapStore } from '@/lib/mapState';
import { useEvents } from '@/hooks/use-events';
import type { CampusEvent } from '@/lib/types';

/**
 * EventMarkers - Displays markers for campus events on the map
 *
 * - Fetches events from API
 * - Groups events by location (multiple events can share coordinates)
 * - Creates custom markers for each unique location
 * - Shows InfoWindow with event list on click
 * - Respects showEvents toggle from store
 */
export const EventMarkers = () => {
  const { mapInstance: map, showEvents } = useMapStore();
  const { data: events = [] } = useEvents();
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // Initialize InfoWindow (reuse single instance)
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Only show markers if toggle is on
    if (!showEvents) {
      return;
    }

    // Filter events that have valid coordinates
    const eventsWithLocation = events.filter(
      (event): event is CampusEvent & { lat: number; lng: number } =>
        typeof event.lat === 'number' &&
        typeof event.lng === 'number'
    );

    // Group events by location
    const eventsByLocation = new Map<string, CampusEvent[]>();
    eventsWithLocation.forEach(event => {
      const key = `${event.lat.toFixed(6)},${event.lng.toFixed(6)}`;
      if (!eventsByLocation.has(key)) {
        eventsByLocation.set(key, []);
      }
      eventsByLocation.get(key)!.push(event);
    });

    // Create markers for each unique location
    eventsByLocation.forEach((locationEvents, locationKey) => {
      const [lat, lng] = locationKey.split(',').map(Number);

      // Create marker with custom color
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: `${locationEvents.length} event${locationEvents.length > 1 ? 's' : ''} here`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#FF6B6B', // Coral/accent color
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        zIndex: 1000, // Ensure events appear above other markers
      });

      // Add click listener to show events
      marker.addListener('click', () => {
        const content = buildEventInfoWindowContent(locationEvents);
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open({
          anchor: marker,
          map: map,
        });
      });

      markersRef.current.set(locationKey, marker);
    });

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current.clear();
      infoWindowRef.current?.close();
    };
  }, [map, showEvents, events]);

  return null;
};

/**
 * Build HTML content for InfoWindow showing event list
 */
function buildEventInfoWindowContent(events: CampusEvent[]): string {
  const locationName = events[0].location || 'This Location';
  const categoryColors = {
    academic: '#3B82F6',
    sports: '#10B981',
    social: '#8B5CF6',
    career: '#F59E0B',
    wellness: '#EC4899',
  };

  let content = `
    <div style="padding: 0 16px 16px 16px; max-width: 350px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
        <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
          Events at ${escapeHtml(locationName)}
        </h3>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          ${events.length} event${events.length > 1 ? 's' : ''}
        </p>
      </div>
      <div style="max-height: 400px; overflow-y: auto; padding-top: 12px;">
  `;

  // Sort events by start date
  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  sortedEvents.forEach((event, index) => {
    const categoryColor = categoryColors[event.category];
    const dateTimeStr = formatEventDateTime(event);

    content += `
      <div style="border-top: ${index === 0 ? 'none' : '1px solid #e5e7eb'}; padding: ${index === 0 ? '0 0 12px 0' : '12px 0'};">
        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #1f2937; line-height: 1.4;">
          ${escapeHtml(event.title)}
        </h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
          ${escapeHtml(dateTimeStr)}
        </p>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="
            display: inline-block;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 500;
            border-radius: 4px;
            background-color: ${categoryColor}15;
            color: ${categoryColor};
            text-transform: capitalize;
          ">
            ${escapeHtml(event.category)}
          </span>
          ${event.url ? `
            <a
              href="${escapeHtml(event.url)}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                font-size: 12px;
                font-weight: 500;
                color: #2563eb;
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 4px;
              "
            >
              View Details
              <span style="font-size: 14px;">→</span>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  });

  content += `
      </div>
    </div>
  `;

  return content;
}

/**
 * Format event date and time for display
 */
function formatEventDateTime(event: CampusEvent): string {
  try {
    const startDate = format(event.start, 'EEE, MMM d');
    const startTime = format(event.start, 'h:mm a');
    const endTime = format(event.end, 'h:mm a');

    // If same day, show: "Wed, Nov 6 • 2:30 PM - 7:00 PM"
    if (format(event.start, 'yyyy-MM-dd') === format(event.end, 'yyyy-MM-dd')) {
      return `${startDate} • ${startTime} - ${endTime}`;
    }

    // If different days, show full dates
    const endDate = format(event.end, 'EEE, MMM d');
    return `${startDate} ${startTime} - ${endDate} ${endTime}`;
  } catch (error) {
    return 'Date/time unavailable';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
