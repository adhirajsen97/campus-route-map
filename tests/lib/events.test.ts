import { describe, it, expect } from 'vitest';
import {
  formatDateForInput,
  getCurrentCampusDate,
  getEventDateRange,
  eventOccursOnDate,
  getCampusTimeZone,
} from '@/lib/events';
import { createMockEvent } from '../fixtures/events';

describe('events utilities', () => {
  describe('getCampusTimeZone()', () => {
    it('should return America/Chicago timezone', () => {
      expect(getCampusTimeZone()).toBe('America/Chicago');
    });
  });

  describe('formatDateForInput()', () => {
    it('should format date in YYYY-MM-DD format', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const result = formatDateForInput(date);
      // Should be in YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle different timezones', () => {
      const date = new Date('2025-01-15T23:00:00Z');
      const result = formatDateForInput(date, 'America/Chicago');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format date consistently', () => {
      const date = new Date('2025-03-05T12:00:00Z');
      const result = formatDateForInput(date);
      // Check it's a valid date string
      expect(result).toBeTruthy();
      expect(result.length).toBe(10); // YYYY-MM-DD is 10 characters
    });
  });

  describe('getCurrentCampusDate()', () => {
    it('should return current date in campus timezone', () => {
      const result = getCurrentCampusDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should accept reference date', () => {
      const referenceDate = new Date('2025-06-15T10:00:00Z');
      const result = getCurrentCampusDate(referenceDate);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use custom timezone', () => {
      const referenceDate = new Date('2025-06-15T10:00:00Z');
      const result = getCurrentCampusDate(referenceDate, 'America/New_York');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getEventDateRange()', () => {
    it('should return start and end dates for single-day event', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00Z'),
        end: new Date('2025-01-15T12:00:00Z'),
      });
      const result = getEventDateRange(event);

      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return start and end dates for multi-day event', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00Z'),
        end: new Date('2025-01-17T12:00:00Z'),
      });
      const result = getEventDateRange(event);

      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.startDate).not.toBe(result.endDate);
    });

    it('should handle events with custom timezone', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00Z'),
        end: new Date('2025-01-15T12:00:00Z'),
      });
      const result = getEventDateRange(event, 'America/New_York');

      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('eventOccursOnDate()', () => {
    it('should return true when event occurs on the given date', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00-06:00'), // CST timezone
        end: new Date('2025-01-15T12:00:00-06:00'),
      });

      const result = eventOccursOnDate(event, '2025-01-15');
      expect(result).toBe(true);
    });

    it('should return false when event occurs before the given date', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00-06:00'),
        end: new Date('2025-01-15T12:00:00-06:00'),
      });

      const result = eventOccursOnDate(event, '2025-01-16');
      expect(result).toBe(false);
    });

    it('should return false when event occurs after the given date', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00-06:00'),
        end: new Date('2025-01-15T12:00:00-06:00'),
      });

      const result = eventOccursOnDate(event, '2025-01-14');
      expect(result).toBe(false);
    });

    it('should return true for multi-day events spanning the date', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00-06:00'),
        end: new Date('2025-01-17T12:00:00-06:00'),
      });

      expect(eventOccursOnDate(event, '2025-01-15')).toBe(true);
      expect(eventOccursOnDate(event, '2025-01-16')).toBe(true);
      expect(eventOccursOnDate(event, '2025-01-17')).toBe(true);
    });

    it('should return true when date is empty string (show all)', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00-06:00'),
        end: new Date('2025-01-15T12:00:00-06:00'),
      });

      const result = eventOccursOnDate(event, '');
      expect(result).toBe(true);
    });

    it('should handle custom timezone', () => {
      const event = createMockEvent({
        start: new Date('2025-01-15T10:00:00Z'),
        end: new Date('2025-01-15T12:00:00Z'),
      });

      const result = eventOccursOnDate(event, '2025-01-15', 'UTC');
      expect(result).toBe(true);
    });
  });
});
