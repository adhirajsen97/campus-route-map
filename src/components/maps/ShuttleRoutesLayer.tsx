import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  DirectionsRenderer,
  InfoWindow,
  Marker,
  Polyline,
} from '@react-google-maps/api';

import { shuttleRoutes } from '@/data/shuttleRoutes';
import { useMapStore } from '@/lib/mapState';
import type { ShuttleRoute, ShuttleStop } from '@/lib/types';

interface StopEntry {
  stop: ShuttleStop;
  routes: ShuttleRoute[];
}

export const ShuttleRoutesLayer = () => {
  const routeVisibility = useMapStore((state) => state.routeVisibility);
  const hoveredStopId = useMapStore((state) => state.hoveredStopId);
  const selectedStopId = useMapStore((state) => state.selectedStopId);
  const setHoveredStopId = useMapStore((state) => state.setHoveredStopId);
  const setSelectedStopId = useMapStore((state) => state.setSelectedStopId);
  const [directionsByRoute, setDirectionsByRoute] = useState<
    Record<string, google.maps.DirectionsResult>
  >({});
  const pendingRoutesRef = useRef(new Set<string>());

  const visibleRoutes = useMemo(
    () => shuttleRoutes.filter((route) => routeVisibility[route.code]),
    [routeVisibility]
  );
  const hasVisibleRoutes = visibleRoutes.length > 0;

  useEffect(() => {
    if (!hasVisibleRoutes) {
      const { hoveredStopId: currentHover, selectedStopId: currentSelected } =
        useMapStore.getState();

      if (currentHover !== null) {
        setHoveredStopId(null);
      }

      if (currentSelected !== null) {
        setSelectedStopId(null);
      }
    }
  }, [hasVisibleRoutes, setHoveredStopId, setSelectedStopId]);

  useEffect(() => {
    return () => {
      const { hoveredStopId: currentHover, selectedStopId: currentSelected } =
        useMapStore.getState();

      if (currentHover !== null) {
        setHoveredStopId(null);
      }

      if (currentSelected !== null) {
        setSelectedStopId(null);
      }
    };
  }, [setHoveredStopId, setSelectedStopId]);

  const stopEntries = useMemo<StopEntry[]>(() => {
    const map = new Map<string, StopEntry>();

    shuttleRoutes.forEach((route) => {
      route.stops.forEach((stop) => {
        const existing = map.get(stop.id);
        if (existing) {
          if (!existing.routes.some((existingRoute) => existingRoute.code === route.code)) {
            existing.routes = [...existing.routes, route];
          }
        } else {
          map.set(stop.id, { stop, routes: [route] });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.stop.name.localeCompare(b.stop.name)
    );
  }, []);

  const selectedStopEntry = useMemo(() => {
    if (!selectedStopId) return null;
    return stopEntries.find((entry) => entry.stop.id === selectedStopId) ?? null;
  }, [selectedStopId, stopEntries]);

  useEffect(() => {
    if (!hoveredStopId) {
      return;
    }

    const entry = stopEntries.find((stopEntry) => stopEntry.stop.id === hoveredStopId);
    if (!entry) {
      return;
    }

    const hasActiveRoute = entry.routes.some((route) => routeVisibility[route.code]);
    if (!hasActiveRoute) {
      setHoveredStopId(null);
    }
  }, [hoveredStopId, routeVisibility, setHoveredStopId, stopEntries]);

  useEffect(() => {
    if (!selectedStopId) {
      return;
    }

    const entry = stopEntries.find((stopEntry) => stopEntry.stop.id === selectedStopId);
    if (!entry) {
      return;
    }

    const hasActiveRoute = entry.routes.some((route) => routeVisibility[route.code]);
    if (!hasActiveRoute) {
      setSelectedStopId(null);
    }
  }, [routeVisibility, selectedStopId, setSelectedStopId, stopEntries]);

  const activeSelectedRoutes = useMemo(() => {
    if (!selectedStopEntry) {
      return [] as ShuttleRoute[];
    }

    return selectedStopEntry.routes.filter((route) => routeVisibility[route.code]);
  }, [routeVisibility, selectedStopEntry]);

  useEffect(() => {
    if (!hasVisibleRoutes || typeof google === 'undefined') {
      return;
    }

    const pendingRoutes = pendingRoutesRef.current;

    const routesToFetch = visibleRoutes.filter((route) => {
      if (route.stops.length < 2) return false;
      if (directionsByRoute[route.code]) return false;
      if (pendingRoutes.has(route.code)) return false;
      return true;
    });

    if (routesToFetch.length === 0) {
      return;
    }

    let isCancelled = false;
    const directionsService = new google.maps.DirectionsService();

    routesToFetch.forEach((route) => {
      pendingRoutes.add(route.code);

      const originStop = route.stops[0];
      const destinationStop = route.stops[route.stops.length - 1];
      const waypointStops = route.stops.slice(1, -1);

      const request: google.maps.DirectionsRequest = {
        origin: { lat: originStop.lat, lng: originStop.lng },
        destination: { lat: destinationStop.lat, lng: destinationStop.lng },
        waypoints: waypointStops.map((stop) => ({
          location: { lat: stop.lat, lng: stop.lng },
          stopover: true,
        })),
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        provideRouteAlternatives: false,
      };

      directionsService.route(request, (result, status) => {
        pendingRoutes.delete(route.code);

        if (isCancelled) {
          return;
        }

        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsByRoute((prev) => ({
            ...prev,
            [route.code]: result,
          }));
        } else {
          console.warn(
            `Failed to fetch directions for shuttle route ${route.code}:`,
            status,
            result
          );
        }
      });
    });

    return () => {
      isCancelled = true;
      routesToFetch.forEach((route) => {
        pendingRoutes.delete(route.code);
      });
    };
  }, [hasVisibleRoutes, visibleRoutes, directionsByRoute]);

  if (!hasVisibleRoutes || typeof google === 'undefined') {
    return null;
  }

  return (
    <>
      {visibleRoutes.map((route) => {
        const directions = directionsByRoute[route.code];
        const fallbackPath = route.stops.map((stop) => ({
          lat: stop.lat,
          lng: stop.lng,
        }));

        return (
          <Fragment key={route.code}>
            {directions ? (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  preserveViewport: true,
                  polylineOptions: {
                    strokeColor: route.color,
                    strokeOpacity: 0.9,
                    strokeWeight: 4,
                    zIndex: 30,
                  },
                }}
              />
            ) : (
              <Polyline
                path={fallbackPath}
                options={{
                  strokeColor: route.color,
                  strokeOpacity: 0.5,
                  strokeWeight: 3,
                  zIndex: 20,
                }}
              />
            )}
          </Fragment>
        );
      })}

      {stopEntries.map(({ stop, routes }) => {
        const activeRoutesForStop = routes.filter((route) => routeVisibility[route.code]);
        if (activeRoutesForStop.length === 0) {
          return null;
        }

        const isHovered = hoveredStopId === stop.id;
        const isSelected = selectedStopId === stop.id;
        const primaryColor = activeRoutesForStop[0]?.color ?? '#2563eb';

        const icon: google.maps.Symbol = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 7 : isHovered ? 6.5 : 5,
          fillColor: primaryColor,
          fillOpacity: isSelected ? 1 : 0.9,
          strokeColor: '#FFFFFF',
          strokeOpacity: 1,
          strokeWeight: isSelected ? 2.2 : 1.6,
        };

        return (
          <Marker
            key={stop.id}
            position={{ lat: stop.lat, lng: stop.lng }}
            icon={icon}
            zIndex={isSelected ? 1200 : isHovered ? 1000 : 900}
            onMouseOver={() => setHoveredStopId(stop.id)}
            onMouseOut={() => setHoveredStopId(null)}
            onClick={() => setSelectedStopId(stop.id)}
            title={`${stop.name} • ${activeRoutesForStop
              .map((route) => route.code)
              .join(', ')}`}
          />
        );
      })}

      {selectedStopEntry && activeSelectedRoutes.length > 0 && (
        <InfoWindow
          position={{
            lat: selectedStopEntry.stop.lat,
            lng: selectedStopEntry.stop.lng,
          }}
          onCloseClick={() => setSelectedStopId(null)}
          options={{
            pixelOffset: new google.maps.Size(0, -12),
            maxWidth: 260,
          }}
        >
          <div className="min-w-[220px] max-w-[260px] space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {selectedStopEntry.stop.name}
              </h3>
              {selectedStopEntry.stop.address && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedStopEntry.stop.address}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Routes
              </p>
              <div className="flex flex-wrap gap-1">
                {activeSelectedRoutes.map((route) => (
                  <span
                    key={route.code}
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-primary-foreground"
                    style={{ backgroundColor: route.color }}
                  >
                    {route.name}
                  </span>
                ))}
              </div>
            </div>

            {selectedStopEntry.stop.isTransferHub && (
              <div className="rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700">
                Transfer hub
              </div>
            )}

            {selectedStopEntry.stop.transfersTo.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Transfers:</span>{' '}
                {selectedStopEntry.stop.transfersTo.join(', ')}
              </div>
            )}

            {selectedStopEntry.stop.departurePattern && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Departures:</span>{' '}
                {selectedStopEntry.stop.departurePattern.replace(/-/g, ' ')}
              </div>
            )}

            {selectedStopEntry.stop.notes && (
              <p className="text-xs text-muted-foreground">
                {selectedStopEntry.stop.notes}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default ShuttleRoutesLayer;
