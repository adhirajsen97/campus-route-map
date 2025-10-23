import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building2, Calendar } from 'lucide-react';
import { useMapStore } from '@/lib/mapState';

export const LayersToggle = () => {
  const { showBuildings, showEvents, toggleBuildings, toggleEvents } = useMapStore();

  // TODO(api): When events API is ready, fetch and display events
  // const { data: events } = await fetch('/api/events');

  return (
    <Card className="border-border shadow-md">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <Label htmlFor="buildings" className="text-sm font-medium cursor-pointer">
              Buildings
            </Label>
          </div>
          <Switch
            id="buildings"
            checked={showBuildings}
            onCheckedChange={toggleBuildings}
          />
        </div>

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
