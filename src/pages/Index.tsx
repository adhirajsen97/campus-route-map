import { useCallback, useEffect, useRef, useState } from 'react';
import { DirectionsRenderer } from '@react-google-maps/api';
import { MapCanvas } from '@/components/maps/MapCanvas';
import { DirectionsPanel } from '@/components/maps/DirectionsPanel';
import { BuildingFootprints } from '@/components/maps/BuildingFootprints';
import { BuildingMarkers } from '@/components/maps/BuildingMarkers';
import { EventMarkers } from '@/components/maps/EventMarkers';
import { LayersToggle } from '@/components/maps/LayersToggle';
import { ShuttleRoutesLayer } from '@/components/maps/ShuttleRoutesLayer';
// import { BuildingInfoPanel } from '@/components/panels/BuildingInfoPanel';
import { EventsPanel } from '@/components/panels/EventsPanel';
// import { mockBuildings } from '@/data/buildings.mock';
import { useMapStore } from '@/lib/mapState';
import { MapPin, Navigation, CalendarDays } from 'lucide-react';
import { CampusMask } from '@/components/maps/CampusMask';
import { CampusBoundary } from '@/components/maps/CampusBoundary';
import anime from '@/lib/anime';
import { EventAssistantBubble } from '@/components/chat/EventAssistantBubble';

const Index = () => {
  const { center, zoom, setMapInstance } = useMapStore();
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [activeSidebarView, setActiveSidebarView] = useState<'directions' | 'events'>('directions');

  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRefs = useRef<{ directions: HTMLButtonElement | null; events: HTMLButtonElement | null }>({
    directions: null,
    events: null,
  });

  const handleRouteComputed = useCallback((result: google.maps.DirectionsResult) => {
    setDirectionsResult(result);
  }, []);

  const handleRouteCleared = useCallback(() => {
    setDirectionsResult(null);
  }, []);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const defaultButton = menuButtonRefs.current.directions;
    if (!indicator || !defaultButton) return;

    indicator.style.width = `${defaultButton.offsetWidth}px`;
    anime({
      targets: indicator,
      translateX: defaultButton.offsetLeft,
      duration: 0,
    });
  }, []);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const activeButton = menuButtonRefs.current[activeSidebarView];
    if (!indicator || !activeButton) return;

    anime({
      targets: indicator,
      translateX: activeButton.offsetLeft,
      width: activeButton.offsetWidth,
      duration: 450,
      easing: 'easeOutExpo',
    });
  }, [activeSidebarView]);

  useEffect(() => {
    if (!contentRef.current) return;

    anime({
      targets: contentRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 320,
      easing: 'easeOutQuad',
    });
  }, [activeSidebarView]);

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground shadow-primary z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-7 w-7" />
              <h1 className="text-2xl font-bold">Campus Navigator</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Map */}
        <div className="flex-1 relative">
          <MapCanvas center={center} zoom={zoom} onMapReady={setMapInstance}>
            {directionsResult && (
              <DirectionsRenderer
                options={{
                  directions: directionsResult,
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: '#1d7ce3',
                    strokeWeight: 5,
                  },
                }}
              />
            )}
            <CampusMask />
            <CampusBoundary />
            <BuildingFootprints />
            <ShuttleRoutesLayer />
            <BuildingMarkers />
            <EventMarkers />
          </MapCanvas>

          {/* Floating Layers Toggle - Top Right */}
          <div className="absolute top-20 right-3 z-10">
            <LayersToggle />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-background border-l border-border flex flex-col min-h-0">
          <div className="border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur">
            <div className="relative flex gap-2">
              <button
                ref={(node) => {
                  menuButtonRefs.current.directions = node;
                }}
                type="button"
                onClick={() => setActiveSidebarView('directions')}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeSidebarView === 'directions'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={activeSidebarView === 'directions'}
              >
                <Navigation className="h-4 w-4" />
                Directions
              </button>
              <button
                ref={(node) => {
                  menuButtonRefs.current.events = node;
                }}
                type="button"
                onClick={() => setActiveSidebarView('events')}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeSidebarView === 'events'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={activeSidebarView === 'events'}
              >
                <CalendarDays className="h-4 w-4" />
                Events
              </button>

              <span
                ref={indicatorRef}
                className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-primary"
                style={{ width: 0 }}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 overflow-y-auto">

              <div
                ref={contentRef}
                className={`space-y-6 ${
                  activeSidebarView === 'events' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''
                }`}
              >
                {activeSidebarView === 'directions' ? (
                  <>
                    <DirectionsPanel
                      directionsResponse={directionsResult}
                      onRouteComputed={handleRouteComputed}
                      onRouteCleared={handleRouteCleared}
                    />

                            <div className="rounded-lg bg-muted p-4 space-y-2">
                      <h3 className="font-semibold text-sm text-foreground">Quick Start</h3>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>• Select a starting point in the directions panel</li>
                        <li>• Click anywhere on the map to see building information</li>
                        <li>• Use the directions button to add a destination</li>
                        <li>• Toggle events layer to show/hide campus events</li>
                        <li>• Drag the map or use zoom controls to explore different areas</li>
                      </ul>
                    </div>
                          </>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <EventsPanel />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <EventAssistantBubble />
    </div>
  );
};

export default Index;
