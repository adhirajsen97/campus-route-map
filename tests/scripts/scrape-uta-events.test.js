import { describe, it, expect } from 'vitest';

// Since the scraper is a script, we'll extract and test the pure functions
// These would ideally be exported from the script for testing

describe('scrape-uta-events utilities', () => {
  describe('formatDatePath()', () => {
    const formatDatePath = (date) => {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      return `${year}/${month}/${day}`;
    };

    it('should format date correctly', () => {
      const date = new Date(Date.UTC(2025, 0, 15)); // Jan 15, 2025
      expect(formatDatePath(date)).toBe('2025/1/15');
    });

    it('should handle single digit months', () => {
      const date = new Date(Date.UTC(2025, 0, 1)); // Jan 1, 2025
      expect(formatDatePath(date)).toBe('2025/1/1');
    });

    it('should handle double digit months', () => {
      const date = new Date(Date.UTC(2025, 11, 31)); // Dec 31, 2025
      expect(formatDatePath(date)).toBe('2025/12/31');
    });

    it('should handle leap year dates', () => {
      const date = new Date(Date.UTC(2024, 1, 29)); // Feb 29, 2024 (leap year)
      expect(formatDatePath(date)).toBe('2024/2/29');
    });

    it('should handle year boundaries', () => {
      const date = new Date(Date.UTC(2024, 11, 31)); // Dec 31, 2024
      expect(formatDatePath(date)).toBe('2024/12/31');
    });
  });

  describe('addDays()', () => {
    const addDays = (date, days) => {
      const result = new Date(date);
      result.setUTCDate(result.getUTCDate() + days);
      return result;
    };

    it('should add days correctly', () => {
      const date = new Date(Date.UTC(2025, 0, 15));
      const result = addDays(date, 5);
      expect(result.getUTCDate()).toBe(20);
    });

    it('should handle month boundaries', () => {
      const date = new Date(Date.UTC(2025, 0, 28)); // Jan 28
      const result = addDays(date, 5); // Should be Feb 2
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(2);
    });

    it('should handle year boundaries', () => {
      const date = new Date(Date.UTC(2024, 11, 30)); // Dec 30, 2024
      const result = addDays(date, 5); // Should be Jan 4, 2025
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(4);
    });

    it('should handle negative days (subtract)', () => {
      const date = new Date(Date.UTC(2025, 0, 15));
      const result = addDays(date, -5);
      expect(result.getUTCDate()).toBe(10);
    });

    it('should handle zero days', () => {
      const date = new Date(Date.UTC(2025, 0, 15));
      const result = addDays(date, 0);
      expect(result.getUTCDate()).toBe(15);
      expect(result.getTime()).toBe(date.getTime());
    });

    it('should handle leap year', () => {
      const date = new Date(Date.UTC(2024, 1, 28)); // Feb 28, 2024 (leap year)
      const result = addDays(date, 1); // Should be Feb 29
      expect(result.getUTCMonth()).toBe(1);
      expect(result.getUTCDate()).toBe(29);
    });
  });

  describe('decodeHtmlEntities()', () => {
    const decodeHtmlEntities = (value) => {
      if (!value) return '';
      return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    };

    it('should decode &amp;', () => {
      expect(decodeHtmlEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    });

    it('should decode &lt; and &gt;', () => {
      expect(decodeHtmlEntities('&lt;div&gt;')).toBe('<div>');
    });

    it('should decode &quot;', () => {
      expect(decodeHtmlEntities('Say &quot;Hello&quot;')).toBe('Say "Hello"');
    });

    it('should decode &#39;', () => {
      expect(decodeHtmlEntities("It&#39;s working")).toBe("It's working");
    });

    it('should decode &nbsp;', () => {
      expect(decodeHtmlEntities('Space&nbsp;here')).toBe('Space here');
    });

    it('should handle multiple entities', () => {
      expect(decodeHtmlEntities('&lt;a href=&quot;#&quot;&gt;Link&lt;/a&gt;')).toBe('<a href="#">Link</a>');
    });

    it('should handle empty string', () => {
      expect(decodeHtmlEntities('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(decodeHtmlEntities(null)).toBe('');
      expect(decodeHtmlEntities(undefined)).toBe('');
    });

    it('should handle text without entities', () => {
      expect(decodeHtmlEntities('Plain text')).toBe('Plain text');
    });
  });

  describe('stripTags()', () => {
    const decodeHtmlEntities = (value) => {
      if (!value) return '';
      return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    };

    const stripTags = (html) => {
      return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    };

    it('should remove HTML tags', () => {
      expect(stripTags('<p>Hello</p>')).toBe('Hello');
    });

    it('should remove multiple tags', () => {
      expect(stripTags('<div><p>Hello <strong>World</strong></p></div>')).toBe('Hello World');
    });

    it('should collapse whitespace', () => {
      expect(stripTags('<p>Hello    World</p>')).toBe('Hello World');
    });

    it('should trim result', () => {
      expect(stripTags('  <p>Hello</p>  ')).toBe('Hello');
    });

    it('should handle self-closing tags', () => {
      expect(stripTags('Text<br/>More text')).toBe('Text More text');
    });

    it('should handle tags with attributes', () => {
      expect(stripTags('<a href="http://example.com" class="link">Link</a>')).toBe('Link');
    });

    it('should decode entities', () => {
      expect(stripTags('<p>Tom &amp; Jerry</p>')).toBe('Tom & Jerry');
    });

    it('should handle nested tags', () => {
      expect(stripTags('<div><span><strong>Bold</strong> text</span></div>')).toBe('Bold text');
    });

    it('should handle text without tags', () => {
      expect(stripTags('Plain text')).toBe('Plain text');
    });
  });

  describe('parseEnvFile()', () => {
    const parseEnvFile = (content) => {
      const env = {};
      if (!content) return env;

      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          env[key] = value;
        }
      }
      return env;
    };

    it('should parse simple key=value pairs', () => {
      const content = 'KEY1=value1\nKEY2=value2';
      const result = parseEnvFile(content);
      expect(result).toEqual({ KEY1: 'value1', KEY2: 'value2' });
    });

    it('should handle quoted values', () => {
      const content = 'KEY="quoted value"';
      const result = parseEnvFile(content);
      expect(result).toEqual({ KEY: 'quoted value' });
    });

    it('should handle single quotes', () => {
      const content = "KEY='single quoted'";
      const result = parseEnvFile(content);
      expect(result).toEqual({ KEY: 'single quoted' });
    });

    it('should ignore comments', () => {
      const content = '# This is a comment\nKEY=value';
      const result = parseEnvFile(content);
      expect(result).toEqual({ KEY: 'value' });
    });

    it('should ignore empty lines', () => {
      const content = 'KEY1=value1\n\nKEY2=value2';
      const result = parseEnvFile(content);
      expect(result).toEqual({ KEY1: 'value1', KEY2: 'value2' });
    });

    it('should handle values with equals signs', () => {
      const content = 'URL=http://example.com?foo=bar';
      const result = parseEnvFile(content);
      expect(result).toEqual({ URL: 'http://example.com?foo=bar' });
    });

    it('should handle empty content', () => {
      const result = parseEnvFile('');
      expect(result).toEqual({});
    });

    it('should handle null/undefined', () => {
      expect(parseEnvFile(null)).toEqual({});
      expect(parseEnvFile(undefined)).toEqual({});
    });

    it('should trim whitespace around keys and values', () => {
      const content = '  KEY  =  value  ';
      const result = parseEnvFile(content);
      expect(result).toEqual({ KEY: 'value' });
    });
  });
});
