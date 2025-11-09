import { Fragment, useEffect, useMemo } from 'react';
import { InfoWindow, Marker, Polyline } from '@react-google-maps/api';
import { shuttleRoutes } from '@/data/shuttleRoutes';
import { useMapStore } from '@/lib/mapState';
import type { ShuttleRoute, ShuttleStop } from '@/lib/types';

interface StopEntry {
  stop: ShuttleStop;
  routes: ShuttleRoute[];
}

export const ShuttleRoutesLayer = () => {
  const {
    showShuttles,
    hoveredStopId,
    setHoveredStopId,
    selectedStopId,
    setSelectedStopId,
  } = useMapStore((state) => ({
    showShuttles: state.showShuttles,
    hoveredStopId: state.hoveredStopId,
    setHoveredStopId: state.setHoveredStopId,
    selectedStopId: state.selectedStopId,
    setSelectedStopId: state.setSelectedStopId,
  }));

  useEffect(() => {
    if (!showShuttles) {
      if (hoveredStopId !== null) {
        setHoveredStopId(null);
      }

      if (selectedStopId !== null) {
        setSelectedStopId(null);
      }
    }
  }, [
    showShuttles,
    hoveredStopId,
    selectedStopId,
    setHoveredStopId,
    setSelectedStopId,
  ]);

  useEffect(() => {
    return () => {
      setHoveredStopId(null);
      setSelectedStopId(null);
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

    return Array.from(map.values()).sort((a, b) => a.stop.name.localeCompare(b.stop.name));
  }, []);

  const selectedStopEntry = useMemo(() => {
    if (!selectedStopId) return null;
    return stopEntries.find((entry) => entry.stop.id === selectedStopId) ?? null;
  }, [selectedStopId, stopEntries]);

  if (!showShuttles || typeof google === 'undefined') {
    return null;
  }

  return (
    <>
      {shuttleRoutes.map((route) => {
        const path = route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }));

        return (
          <Fragment key={route.code}>
            <Polyline
              path={path}
              options={{
                strokeColor: route.color,
                strokeOpacity: 0.85,
                strokeWeight: 4,
                zIndex: 30,
              }}
            />
          </Fragment>
        );
      })}

      {stopEntries.map(({ stop, routes }) => {
        const isHovered = hoveredStopId === stop.id;
        const isSelected = selectedStopId === stop.id;
        const primaryColor = routes[0]?.color ?? '#2563eb';

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
            title={`${stop.name} • ${routes.map((route) => route.code).join(', ')}`}
          />
        );
      })}

      {selectedStopEntry && (
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
                {selectedStopEntry.routes.map((route) => (
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
