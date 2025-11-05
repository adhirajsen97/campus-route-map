import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarSearch, ExternalLink, MapPin, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEvents } from '@/hooks/use-events';

const formatDateForInput = (date: Date) => format(date, 'yyyy-MM-dd');

export const EventsPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const { data: events = [], isLoading, isError, refetch, isRefetching } = useEvents();

  const uniqueLocations = useMemo(() => (
    Array.from(
      new Set(
        events
          .map((event) => event.location?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b))
  ), [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return events
      .filter((event) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          event.title.toLowerCase().includes(normalizedSearch) ||
          event.description?.toLowerCase().includes(normalizedSearch) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch));

        const matchesDate =
          selectedDate === '' ||
          formatDateForInput(event.start) === selectedDate ||
          formatDateForInput(event.end) === selectedDate;

        const matchesLocation =
          selectedLocation === 'all' || event.location?.toLowerCase() === selectedLocation.toLowerCase();

        return matchesSearch && matchesDate && matchesLocation;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, searchTerm, selectedDate, selectedLocation]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setSelectedLocation('all');
  };

  const renderContent = () => {
    if (isLoading || isRefetching) {
      return (
        <div className="text-sm text-muted-foreground text-center py-6">
          Loading the latest campus events...
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-sm text-muted-foreground text-center py-6 space-y-3">
          <p>We couldn&apos;t load events right now.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
            disabled={isRefetching}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    if (filteredEvents.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-center py-6">
          No events match your filters. Try adjusting the search or filters above.
        </div>
      );
    }

    return filteredEvents.map((event) => (
      <div key={event.id} className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-foreground">{event.title}</h3>
            <p className="text-xs text-muted-foreground">
              {`${format(event.start, 'EEE, MMM d • h:mm a')} – ${format(event.end, 'h:mm a')}`}
            </p>
          </div>
          {event.url && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
              <a href={event.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open event details</span>
              </a>
            </Button>
          )}
        </div>

        {event.location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{event.location}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {event.category}
          </Badge>
          {event.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarSearch className="h-5 w-5 text-primary" />
          Campus Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search events by name or tag"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="events-date" className="text-xs font-medium text-muted-foreground">
                Filter by date
              </label>
              <Input
                id="events-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="events-location" className="text-xs font-medium text-muted-foreground">
                Filter by location
              </label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="events-location">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {uniqueLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              disabled={!searchTerm && !selectedDate && selectedLocation === 'all'}
            >
              Reset filters
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[420px] pr-4">
          <div className="space-y-3">
            {renderContent()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default EventsPanel;
