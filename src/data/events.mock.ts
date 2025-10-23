import { CampusEvent } from '@/lib/types';

// Mock campus events data
export const mockEvents: CampusEvent[] = [
  {
    id: 'evt-001',
    title: 'Career Fair 2024',
    description: 'Annual career fair with 100+ employers',
    start: new Date('2024-03-15T09:00:00'),
    end: new Date('2024-03-15T17:00:00'),
    lat: 37.7759,
    lng: -122.4208,
    category: 'career',
    buildingId: 'stu-001',
  },
  {
    id: 'evt-002',
    title: 'Spring Concert Series',
    description: 'Live music performances by student ensembles',
    start: new Date('2024-03-20T19:00:00'),
    end: new Date('2024-03-20T21:00:00'),
    lat: 37.7755,
    lng: -122.4170,
    category: 'social',
    buildingId: 'arts-001',
  },
  {
    id: 'evt-003',
    title: 'Research Symposium',
    description: 'Showcase of undergraduate and graduate research',
    start: new Date('2024-03-22T10:00:00'),
    end: new Date('2024-03-22T16:00:00'),
    lat: 37.7739,
    lng: -122.4180,
    category: 'academic',
    buildingId: 'sci-001',
  },
  {
    id: 'evt-004',
    title: 'Intramural Basketball Finals',
    description: 'Championship game for campus basketball league',
    start: new Date('2024-03-18T18:00:00'),
    end: new Date('2024-03-18T20:00:00'),
    lat: 37.7735,
    lng: -122.4215,
    category: 'sports',
    buildingId: 'gym-001',
  },
];
