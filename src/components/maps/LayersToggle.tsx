import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BusFront, Calendar } from 'lucide-react';
import { useMapStore } from '@/lib/mapState';

export const LayersToggle = () => {
  const { showEvents, toggleEvents, showShuttles, toggleShuttles } = useMapStore();

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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BusFront className="h-4 w-4 text-accent" />
              <Label htmlFor="shuttles" className="text-sm font-medium cursor-pointer">
                Shuttles
              </Label>
            </div>
            <Switch
              id="shuttles"
              checked={showShuttles}
              onCheckedChange={toggleShuttles}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
