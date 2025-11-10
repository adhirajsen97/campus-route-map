import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents } from '@/hooks/use-events';
import { createQueryWrapper } from '../mocks/reactQuery';
import { mockEventsResponse } from '../fixtures/events';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('use-events hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEvents()', () => {
    it('should fetch and transform events successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEventsResponse,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBe(4);
      expect(result.current.isError).toBe(false);
    });

    it('should handle array response format', async () => {
      const eventsArray = mockEventsResponse.events;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsArray,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBe(4);
    });

    it('should handle object with events array format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEventsResponse,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBe(4);
    });

    it('should sort events by start date ascending', async () => {
      const unsortedEvents = {
        events: [
          {
            id: 'event-1',
            title: 'Event 1',
            start: '2025-01-20T10:00:00Z',
            end: '2025-01-20T12:00:00Z',
          },
          {
            id: 'event-2',
            title: 'Event 2',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
          },
          {
            id: 'event-3',
            title: 'Event 3',
            start: '2025-01-18T10:00:00Z',
            end: '2025-01-18T12:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => unsortedEvents,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const events = result.current.data!;
      expect(events[0].title).toBe('Event 2'); // Jan 15
      expect(events[1].title).toBe('Event 3'); // Jan 18
      expect(events[2].title).toBe('Event 1'); // Jan 20
    });

    it('should filter out events without title', async () => {
      const eventsWithoutTitle = {
        events: [
          {
            id: 'event-1',
            title: 'Valid Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
          },
          {
            id: 'event-2',
            title: '',
            start: '2025-01-16T10:00:00Z',
            end: '2025-01-16T12:00:00Z',
          },
          {
            id: 'event-3',
            start: '2025-01-17T10:00:00Z',
            end: '2025-01-17T12:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithoutTitle,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.length).toBe(1);
      expect(result.current.data?.[0].title).toBe('Valid Event');
    });

    it('should filter out events without start date', async () => {
      const eventsWithoutStart = {
        events: [
          {
            id: 'event-1',
            title: 'Valid Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
          },
          {
            id: 'event-2',
            title: 'Invalid Event',
            end: '2025-01-16T12:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithoutStart,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.length).toBe(1);
      expect(result.current.data?.[0].title).toBe('Valid Event');
    });

    it('should filter out events without id or url', async () => {
      const eventsWithoutId = {
        events: [
          {
            id: 'event-1',
            title: 'Valid Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
          },
          {
            title: 'No ID Event',
            start: '2025-01-16T10:00:00Z',
            end: '2025-01-16T12:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithoutId,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.length).toBe(1);
      expect(result.current.data?.[0].title).toBe('Valid Event');
    });

    it('should use end date same as start if end is missing', async () => {
      const eventsWithoutEnd = {
        events: [
          {
            id: 'event-1',
            title: 'Event',
            start: '2025-01-15T10:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithoutEnd,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const event = result.current.data?.[0];
      expect(event?.start).toEqual(event?.end);
    });

    it('should default category to academic if not provided', async () => {
      const eventsWithoutCategory = {
        events: [
          {
            id: 'event-1',
            title: 'Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithoutCategory,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const event = result.current.data?.[0];
      expect(event?.category).toBe('academic');
    });

    it('should normalize tags correctly', async () => {
      const eventsWithTags = {
        events: [
          {
            id: 'event-1',
            title: 'Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
            tags: ['tag1', '  tag2  ', '', 'tag3'],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithTags,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const event = result.current.data?.[0];
      expect(event?.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle non-array tags', async () => {
      const eventsWithInvalidTags = {
        events: [
          {
            id: 'event-1',
            title: 'Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
            tags: 'not-an-array',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithInvalidTags,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const event = result.current.data?.[0];
      expect(event?.tags).toEqual([]);
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle empty events array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: [] }),
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isError).toBe(false);
    });

    it('should preserve lat/lng coordinates', async () => {
      const eventsWithCoords = {
        events: [
          {
            id: 'event-1',
            title: 'Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T12:00:00Z',
            lat: 32.7311,
            lng: -97.1151,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => eventsWithCoords,
      });

      const { result } = renderHook(() => useEvents(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const event = result.current.data?.[0];
      expect(event?.lat).toBe(32.7311);
      expect(event?.lng).toBe(-97.1151);
    });
  });
});
