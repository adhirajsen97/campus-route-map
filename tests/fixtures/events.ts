import type { CampusEvent } from '@/lib/types';

export const createMockEvent = (overrides?: Partial<CampusEvent>): CampusEvent => ({
  id: 'event-1',
  title: 'Test Event',
  description: 'This is a test event',
  start: new Date('2025-01-15T10:00:00Z'),
  end: new Date('2025-01-15T12:00:00Z'),
  lat: 32.7311,
  lng: -97.1151,
  category: 'academic',
  location: 'Test Building',
  url: 'https://example.com/event-1',
  tags: ['test', 'academic'],
  ...overrides,
});

export const mockEvents: CampusEvent[] = [
  createMockEvent({
    id: 'event-1',
    title: 'Career Fair',
    category: 'career',
    start: new Date('2025-01-15T10:00:00Z'),
    end: new Date('2025-01-15T16:00:00Z'),
    location: 'Student Center',
    tags: ['career', 'networking'],
  }),
  createMockEvent({
    id: 'event-2',
    title: 'Basketball Game',
    category: 'sports',
    start: new Date('2025-01-16T19:00:00Z'),
    end: new Date('2025-01-16T21:00:00Z'),
    location: 'Arena',
    tags: ['sports', 'basketball'],
  }),
  createMockEvent({
    id: 'event-3',
    title: 'Guest Lecture',
    category: 'academic',
    start: new Date('2025-01-17T14:00:00Z'),
    end: new Date('2025-01-17T16:00:00Z'),
    location: 'Engineering Building',
    tags: ['academic', 'lecture'],
  }),
  createMockEvent({
    id: 'event-4',
    title: 'Yoga Class',
    category: 'wellness',
    start: new Date('2025-01-18T08:00:00Z'),
    end: new Date('2025-01-18T09:00:00Z'),
    location: 'Wellness Center',
    tags: ['wellness', 'fitness'],
  }),
];

export const mockEventsResponse = {
  scrapedAt: '2025-01-10T00:00:00Z',
  events: mockEvents.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    location: event.location,
    url: event.url,
    tags: event.tags,
    category: event.category,
    lat: event.lat,
    lng: event.lng,
  })),
};
