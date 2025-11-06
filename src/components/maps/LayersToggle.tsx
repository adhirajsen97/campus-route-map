import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from 'lucide-react';
import { useMapStore } from '@/lib/mapState';

export const LayersToggle = () => {
  const { showEvents, toggleEvents } = useMapStore();

  // TODO(api): When events API is ready, fetch and display events
  // const { data: events } = await fetch('/api/events');

  return (
    <Card className="border-border shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
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
      </CardContent>
    </Card>
  );
};
