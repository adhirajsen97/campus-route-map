import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarSearch, Check, ChevronsUpDown, ExternalLink, MapPin, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { eventOccursOnDate } from '@/lib/events';
import { useEvents } from '@/hooks/use-events';

export const EventsPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const { data: events = [], isLoading, isError, refetch, isRefetching } = useEvents();

  const uniqueLocations = useMemo(() => {
    const seen = new Map<string, string>();

    events.forEach((event) => {
      const location = event.location?.trim();
      if (!location) {
        return;
      }

      const key = location.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, location);
      }
    });

    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const uniqueTags = useMemo(() => {
    const seen = new Map<string, string>();

    events.forEach((event) => {
      event.tags?.forEach((tag) => {
        const normalized = tag.trim();
        if (normalized.length === 0) {
          return;
        }

        const key = normalized.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, normalized);
        }
      });
    });

    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const normalizedSelectedLocation = selectedLocation === 'all' ? null : selectedLocation.trim().toLowerCase();
  const normalizedSelectedTag = selectedTag === 'all' ? null : selectedTag.trim().toLowerCase();

  useEffect(() => {
    if (selectedTag !== 'all' && (!normalizedSelectedTag || !uniqueTags.some((tag) => tag.toLowerCase() === normalizedSelectedTag))) {
      setSelectedTag('all');
    }

    if (uniqueTags.length === 0 && isTagOpen) {
      setIsTagOpen(false);
    }
  }, [selectedTag, normalizedSelectedTag, uniqueTags, isTagOpen]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return events
      .filter((event) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          event.title.toLowerCase().includes(normalizedSearch) ||
          event.description?.toLowerCase().includes(normalizedSearch) ||
          event.location?.toLowerCase().includes(normalizedSearch) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch));

        const matchesDate = selectedDate === '' || eventOccursOnDate(event, selectedDate);

        const matchesLocation =
          !normalizedSelectedLocation || event.location?.trim().toLowerCase() === normalizedSelectedLocation;

        const matchesTag =
          !normalizedSelectedTag || event.tags?.some((tag) => tag.toLowerCase() === normalizedSelectedTag) === true;

        return matchesSearch && matchesDate && matchesLocation && matchesTag;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, searchTerm, selectedDate, normalizedSelectedLocation, normalizedSelectedTag]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setSelectedLocation('all');
    setSelectedTag('all');
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
    <Card className="border-border shadow-md h-full min-h-0 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarSearch className="h-5 w-5 text-primary" />
          Campus Events
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
        <div className="space-y-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search events by name, location, or tag"
              className="pl-9"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="space-y-1.5 sm:flex-1 min-w-[200px]">
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
            <div className="space-y-1.5 sm:flex-1 min-w-[200px]">
              <label htmlFor="events-location" className="text-xs font-medium text-muted-foreground">
                Filter by location
              </label>
              <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="events-location"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isLocationOpen}
                    className="w-full justify-between gap-2"
                  >
                    {selectedLocation === 'all' ? 'All locations' : selectedLocation}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[260px] sm:w-[320px]"
                  align="start"
                  sideOffset={8}
                  style={{ width: 'var(--radix-popover-trigger-width, 260px)' }}
                >
                  <Command>
                    <CommandInput placeholder="Search locations..." />
                    <CommandList>
                      <CommandEmpty>No locations found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedLocation('all');
                            setIsLocationOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', selectedLocation === 'all' ? 'opacity-100' : 'opacity-0')} />
                          All locations
                        </CommandItem>
                        {uniqueLocations.map((location) => (
                          <CommandItem
                            key={location}
                            value={location}
                            onSelect={() => {
                              setSelectedLocation(location);
                              setIsLocationOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                normalizedSelectedLocation &&
                                  location.toLowerCase() === normalizedSelectedLocation
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            {location}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5 sm:flex-1 min-w-[200px]">
              <label htmlFor="events-tag" className="text-xs font-medium text-muted-foreground">
                Filter by tag
              </label>
              <Popover open={isTagOpen} onOpenChange={setIsTagOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="events-tag"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isTagOpen}
                    className="w-full justify-between gap-2"
                    disabled={uniqueTags.length === 0}
                  >
                    {selectedTag === 'all'
                      ? uniqueTags.length === 0
                        ? 'No tags available'
                        : 'All tags'
                      : selectedTag}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[260px] sm:w-[320px]"
                  align="start"
                  sideOffset={8}
                  style={{ width: 'var(--radix-popover-trigger-width, 260px)' }}
                >
                  <Command>
                    <CommandInput placeholder="Search tags..." />
                    <CommandList>
                      <CommandEmpty>No tags found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedTag('all');
                            setIsTagOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', selectedTag === 'all' ? 'opacity-100' : 'opacity-0')} />
                          All tags
                        </CommandItem>
                        {uniqueTags.map((tag) => (
                          <CommandItem
                            key={tag}
                            value={tag}
                            onSelect={() => {
                              setSelectedTag(tag);
                              setIsTagOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                normalizedSelectedTag && tag.toLowerCase() === normalizedSelectedTag
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            {tag}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              disabled={
                !searchTerm &&
                !selectedDate &&
                selectedLocation === 'all' &&
                selectedTag === 'all'
              }
            >
              Reset filters
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 sm:pr-2">
            <div className="space-y-3 pr-3 sm:pr-4">{renderContent()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventsPanel;
