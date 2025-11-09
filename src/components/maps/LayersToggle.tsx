import { useMemo } from 'react';
import { BusFront, Calendar, Info } from 'lucide-react';

import { shuttleRoutes } from '@/data/shuttleRoutes';
import { useMapStore } from '@/lib/mapState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import type { ShuttleRoute } from '@/lib/types';

const RouteInfoDialog = ({ route }: { route: ShuttleRoute }) => {
  const serviceHours = `${route.service.days} • ${route.service.start} – ${route.service.end} (${route.service.timeZone})`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">View {route.name} information</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: route.color }}
            />
            {route.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Hours of operation</p>
            <p className="text-sm text-muted-foreground">{serviceHours}</p>
            <p className="mt-1 text-xs text-muted-foreground">{route.service.label}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Stops</p>
            <ScrollArea className="mt-2 max-h-60 pr-2">
              <ul className="space-y-2">
                {route.stops.map((stop) => (
                  <li key={stop.id}>
                    <p className="text-sm font-medium text-foreground">{stop.name}</p>
                    {stop.address && (
                      <p className="text-xs text-muted-foreground">{stop.address}</p>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const LayersToggle = () => {
  const showEvents = useMapStore((state) => state.showEvents);
  const toggleEvents = useMapStore((state) => state.toggleEvents);
  const routeVisibility = useMapStore((state) => state.routeVisibility);
  const toggleRouteVisibility = useMapStore((state) => state.toggleRouteVisibility);
  const enableAllRoutes = useMapStore((state) => state.enableAllRoutes);
  const disableAllRoutes = useMapStore((state) => state.disableAllRoutes);

  const { activeCount, anyActive } = useMemo(() => {
    const active = shuttleRoutes.filter((route) => routeVisibility[route.code]).length;
    return {
      activeCount: active,
      anyActive: active > 0,
    };
  }, [routeVisibility]);

  const summaryLabel = anyActive
    ? `${activeCount}/${shuttleRoutes.length} active`
    : 'All routes hidden';

  // TODO(api): When events API is ready, fetch and display events
  // const { data: events } = await fetch('/api/events');

  return (
    <Card className="border-border shadow-md">
      <CardContent className="p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <Label htmlFor="events" className="text-sm font-medium cursor-pointer">
                Events
              </Label>
            </div>
            <Switch
              id="events"
              checked={showEvents}
              onCheckedChange={toggleEvents}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <BusFront className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Shuttles</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{summaryLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Shuttle routes</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={anyActive ? disableAllRoutes : enableAllRoutes}
                  >
                    {anyActive ? 'Hide all' : 'Show all'}
                  </Button>
                </div>
                <div className="space-y-2">
                  {shuttleRoutes.map((route) => {
                    const isActive = routeVisibility[route.code];

                    return (
                      <div
                        key={route.code}
                        className="flex items-start gap-3 rounded-md border border-border/70 bg-background px-3 py-2"
                      >
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: route.color }}
                            />
                            <p className="text-sm font-medium text-foreground">{route.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {route.service.days} • {route.service.start} – {route.service.end}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <RouteInfoDialog route={route} />
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => toggleRouteVisibility(route.code)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
};
