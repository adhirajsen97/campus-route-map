import { useEffect, useMemo, useState } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { format } from 'date-fns';
import { CalendarClock, ExternalLink } from 'lucide-react';

import type { Building, CampusEvent } from '@/lib/types';
import { useEvents } from '@/hooks/use-events';
import { eventOccursOnDate, getCurrentCampusDate } from '@/lib/events';
import { useMapStore } from '@/lib/mapState';
import { Badge } from '@/components/ui/badge';

interface EventsMarkerLayerProps {
  buildings: Building[];
}

interface EventGroup {
  id: string;
  position: google.maps.LatLngLiteral;
  label: string;
  events: CampusEvent[];
  location?: string;
}

const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const buildGroupKey = (source: { buildingId?: string; position?: google.maps.LatLngLiteral; location?: string }) => {
  if (source.buildingId) {
    return `building:${source.buildingId}`;
  }

  if (source.position) {
    const { lat, lng } = source.position;
    return `coords:${lat.toFixed(6)},${lng.toFixed(6)}`;
  }

  if (source.location) {
    return `location:${normalizeForSearch(source.location)}`;
  }

  return null;
};

const resolveEventLocation = (event: CampusEvent, buildings: Building[]) => {
  if (typeof event.lat === 'number' && typeof event.lng === 'number') {
    return {
      position: { lat: event.lat, lng: event.lng },
      label: event.location ?? event.title,
      buildingId: event.buildingId,
      location: event.location,
    };
  }

  if (!event.location) {
    return null;
  }

  const normalizedLocation = normalizeForSearch(event.location);

  const matchedBuilding = buildings.find((building) => {
    const normalizedName = normalizeForSearch(building.name);
    if (normalizedLocation.includes(normalizedName)) {
      return true;
    }

    const normalizedCode = normalizeForSearch(building.code);
    const locationTokens = new Set(normalizedLocation.split(' ').filter(Boolean));
    if (locationTokens.has(normalizedCode)) {
      return true;
    }

    if (building.tags?.some((tag) => normalizedLocation.includes(normalizeForSearch(tag)))) {
      return true;
    }

    return false;
  });

  if (!matchedBuilding) {
    return null;
  }

  return {
    position: { lat: matchedBuilding.lat, lng: matchedBuilding.lng },
    label: matchedBuilding.name,
    buildingId: matchedBuilding.id,
    location: event.location,
  };
};

export const EventsMarkerLayer = ({ buildings }: EventsMarkerLayerProps) => {
  const { showEvents } = useMapStore();
  const { data: events = [] } = useEvents();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const campusDate = getCurrentCampusDate();

  const todaysEvents = useMemo(
    () => events.filter((event) => eventOccursOnDate(event, campusDate)),
    [events, campusDate],
  );

  const eventGroups = useMemo(() => {
    const groups = new Map<string, EventGroup>();

    todaysEvents.forEach((event) => {
      const resolved = resolveEventLocation(event, buildings);
      if (!resolved) {
        return;
      }

      const key = buildGroupKey(resolved);
      if (!key) {
        return;
      }

      const group = groups.get(key);
      if (group) {
        group.events.push(event);
        group.events.sort((a, b) => a.start.getTime() - b.start.getTime());
        return;
      }

      groups.set(key, {
        id: key,
        position: resolved.position,
        label: resolved.label,
        location: resolved.location,
        events: [event],
      });
    });

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [todaysEvents, buildings]);

  useEffect(() => {
    if (!showEvents && activeGroupId !== null) {
      setActiveGroupId(null);
    }
  }, [showEvents, activeGroupId]);

  useEffect(() => {
    if (activeGroupId && !eventGroups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(null);
    }
  }, [activeGroupId, eventGroups]);

  if (!showEvents || typeof google === 'undefined') {
    return null;
  }

  if (eventGroups.length === 0) {
    return null;
  }

  const activeGroup = activeGroupId ? eventGroups.find((group) => group.id === activeGroupId) : null;

  return (
    <>
      {eventGroups.map((group) => (
        <Marker
          key={group.id}
          position={group.position}
          onClick={() => setActiveGroupId(group.id)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#f97316',
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }}
        />
      ))}

      {activeGroup && (
        <InfoWindow position={activeGroup.position} onCloseClick={() => setActiveGroupId(null)}>
          <div className="p-2 max-w-xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-accent" />
              <span>{activeGroup.label}</span>
            </div>
            <div className="space-y-3">
              {activeGroup.events.map((event) => (
                <div key={event.id} className="space-y-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-foreground leading-snug">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${format(event.start, 'EEE, MMM d • h:mm a')} – ${format(event.end, 'h:mm a')}`}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {event.category}
                    </Badge>
                    {event.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Event details
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default EventsMarkerLayer;
