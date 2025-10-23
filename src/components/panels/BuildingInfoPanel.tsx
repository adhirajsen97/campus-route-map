import { Building } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Clock, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BuildingInfoPanelProps {
  building: Building;
  onClose: () => void;
}

export const BuildingInfoPanel = ({ building, onClose }: BuildingInfoPanelProps) => {
  // TODO(api): Fetch full building details from API
  // const { data } = await fetch(`/api/buildings/${building.id}`);

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <Building2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-xl">{building.name}</CardTitle>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                {building.code}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 -mt-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {building.description && (
          <p className="text-sm text-foreground leading-relaxed">
            {building.description}
          </p>
        )}

        {building.hours && (
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Hours</p>
              <p className="text-muted-foreground">{building.hours}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">Location</p>
            <p className="text-muted-foreground">
              {building.lat.toFixed(4)}, {building.lng.toFixed(4)}
            </p>
          </div>
        </div>

        {building.tags && building.tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Features</p>
            <div className="flex flex-wrap gap-2">
              {building.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
