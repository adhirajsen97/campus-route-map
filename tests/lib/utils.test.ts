import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn()', () => {
    it('should return empty string when no arguments provided', () => {
      expect(cn()).toBe('');
    });

    it('should return single class name', () => {
      expect(cn('text-red-500')).toBe('text-red-500');
    });

    it('should combine multiple class names', () => {
      expect(cn('text-red-500', 'bg-blue-200')).toBe('text-red-500 bg-blue-200');
    });

    it('should handle conditional classes with falsy values', () => {
      const shouldHide = false;
      expect(cn('base-class', shouldHide && 'hidden', null, undefined)).toBe('base-class');
    });

    it('should handle conditional classes with truthy values', () => {
      const shouldShow = true;
      expect(cn('base-class', shouldShow && 'active')).toBe('base-class active');
    });

    it('should merge Tailwind classes correctly', () => {
      // tailwind-merge should keep the last conflicting class
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('should handle array of classes', () => {
      expect(cn(['text-sm', 'font-bold'])).toBe('text-sm font-bold');
    });

    it('should handle object with class conditions', () => {
      expect(
        cn({
          'text-red-500': true,
          'bg-blue-200': false,
          'font-bold': true,
        })
      ).toBe('text-red-500 font-bold');
    });

    it('should handle mixed input types', () => {
      expect(
        cn(
          'base-class',
          ['array-class'],
          { 'object-class': true, 'hidden': false },
          'another-class'
        )
      ).toBe('base-class array-class object-class another-class');
    });

    it('should trim and remove extra whitespace', () => {
      expect(cn('  text-sm  ', '  font-bold  ')).toBe('text-sm font-bold');
    });
  });
});
