#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const BASE_URL = 'https://events.uta.edu/calendar/day';
const EVENTS_PER_PAGE = 21;
const DAYS_TO_FETCH = 14;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const dbPath = join(projectRoot, 'data', 'events.sqlite');
const jsonPath = join(projectRoot, 'data', 'events.json');
const envPath = join(projectRoot, '.env');

const DEFAULT_SCRAPE_FREQUENCY_DAYS = 1;

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    event_date TEXT,
    location TEXT,
    tags TEXT,
    url TEXT UNIQUE,
    scraped_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const upsertEventStatement = db.prepare(`
  INSERT INTO events (name, event_date, location, tags, url, scraped_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(url) DO UPDATE SET
    name = excluded.name,
    event_date = excluded.event_date,
    location = excluded.location,
    tags = excluded.tags,
    scraped_at = datetime('now')
`);

function formatDatePath(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${year}/${month}/${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function fetchPage(datePath, pageNumber) {
  const pageSuffix = pageNumber > 1 ? `/${pageNumber}` : '';
  const url = `${BASE_URL}/${datePath}${pageSuffix}`;
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'user-agent': 'campus-route-map-events-scraper/1.0 (+https://github.com/campus-route-map)',
        'accept': 'text/html,application/xhtml+xml'
      }
    });
  } catch (error) {
    throw new Error(`Network error while fetching ${url}: ${error.message}`, { cause: error });
  }

  if (!response.ok) {
    if (response.status === 404) {
      return { html: null };
    }
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return { html };
}

function decodeHtmlEntities(value) {
  if (!value) return '';
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return { entries: new Map(), records: [] };
  }

  const contents = readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const entries = new Map();
  const records = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      records.push({ type: 'blank', value: '' });
      continue;
    }

    if (line.trim().startsWith('#')) {
      records.push({ type: 'comment', value: line });
      continue;
    }

    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) {
      records.push({ type: 'other', value: line });
      continue;
    }

    const key = match[1];
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries.set(key, value);
    records.push({ type: 'entry', key });
  }

  return { entries, records };
}

function writeEnvFile(envFile, updates) {
  const seenKeys = new Set();
  const lines = envFile.records.map((record) => {
    if (record.type === 'entry') {
      const key = record.key;
      const value = updates.has(key) ? updates.get(key) : envFile.entries.get(key) ?? '';
      seenKeys.add(key);
      return `${key}=${value}`;
    }

    if (record.type === 'comment' || record.type === 'other') {
      return record.value;
    }

    return '';
  });

  for (const [key, value] of updates.entries()) {
    if (seenKeys.has(key)) continue;
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push(`${key}=${value}`);
  }

  writeFileSync(envPath, `${lines.join('\n')}`.trimEnd() + '\n');
}

function getEnvValue(envFile, key) {
  return process.env[key] ?? envFile.entries.get(key) ?? null;
}

function parseFrequencyDays(value) {
  if (!value) {
    return DEFAULT_SCRAPE_FREQUENCY_DAYS;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_SCRAPE_FREQUENCY_DAYS;
  }

  return parsed;
}

function readLastScrapedAtFromJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const contents = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(contents);
    const scrapedAt = parsed?.scrapedAt;
    if (typeof scrapedAt !== 'string') {
      return null;
    }

    const date = new Date(scrapedAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return scrapedAt;
  } catch (error) {
    console.warn(`Failed to read last scraped timestamp from ${filePath}:`, error);
    return null;
  }
}

function resolveLastRunTimestamp(envLastRunIso, jsonLastRunIso) {
  const candidates = [];

  if (envLastRunIso) {
    const envDate = new Date(envLastRunIso);
    if (!Number.isNaN(envDate.getTime())) {
      candidates.push({ iso: envLastRunIso, timestamp: envDate.getTime(), source: 'SCRAPE_EVENTS_LAST_RUN' });
    }
  }

  if (jsonLastRunIso) {
    const jsonDate = new Date(jsonLastRunIso);
    if (!Number.isNaN(jsonDate.getTime())) {
      candidates.push({ iso: jsonLastRunIso, timestamp: jsonDate.getTime(), source: 'data/events.json' });
    }
  }

  if (candidates.length === 0) {
    return { iso: null, source: 'unknown' };
  }

  candidates.sort((a, b) => b.timestamp - a.timestamp);
  const [latest] = candidates;
  return { iso: latest.iso, source: latest.source };
}

function shouldSkipRun(lastRunIso, frequencyDays, now) {
  if (!lastRunIso) {
    return false;
  }

  const lastRun = new Date(lastRunIso);
  if (Number.isNaN(lastRun.getTime())) {
    return false;
  }

  const diffMs = now.getTime() - lastRun.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < frequencyDays;
}

function calculateNextEligibleRun(lastRunIso, frequencyDays) {
  if (!lastRunIso) {
    return null;
  }

  const lastRun = new Date(lastRunIso);
  if (Number.isNaN(lastRun.getTime())) {
    return null;
  }

  const next = new Date(lastRun.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
  return next;
}

function extractJsonFromScript(scriptHtml) {
  const match = scriptHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return null;
  }

  const raw = match[1].trim();
  if (raw.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed[0] ?? null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse JSON-LD payload', error);
    return null;
  }
}

function extractElement(html, startIndex) {
  const startTagEnd = html.indexOf('>', startIndex);
  if (startTagEnd === -1) return null;
  const tagNameMatch = html.slice(startIndex + 1, startTagEnd).match(/^([a-zA-Z0-9:-]+)/);
  if (!tagNameMatch) return null;
  const tagName = tagNameMatch[1];
  let depth = 1;
  let index = startTagEnd + 1;
  const openPattern = `<${tagName}`;
  const closePattern = `</${tagName}>`;
  while (index < html.length) {
    const nextOpen = html.indexOf('<', index);
    if (nextOpen === -1) break;
    if (html.startsWith(closePattern, nextOpen)) {
      depth -= 1;
      index = html.indexOf('>', nextOpen);
      if (index === -1) break;
      index += 1;
      if (depth === 0) {
        return {
          content: html.slice(startIndex, index),
          endIndex: index
        };
      }
      continue;
    }

    if (html.startsWith(openPattern, nextOpen)) {
      const afterChar = html.charAt(nextOpen + openPattern.length);
      if (afterChar === ' ' || afterChar === '>' || afterChar === '\\n' || afterChar === '\\t' || afterChar === '/' || afterChar === '\\r') {
        depth += 1;
      }
      index = nextOpen + 1;
      continue;
    }

    index = nextOpen + 1;
  }

  return null;
}

function extractEventEntries(html) {
  const entries = [];
  const eventsRootIndex = html.indexOf('id="event_results"');
  if (eventsRootIndex === -1) {
    return entries;
  }

  let cursor = eventsRootIndex;
  while (cursor < html.length) {
    const scriptIndex = html.indexOf('<script type="application/ld+json">', cursor);
    if (scriptIndex === -1) {
      break;
    }

    const scriptElement = extractElement(html, scriptIndex);
    if (!scriptElement) {
      break;
    }

    const cardIndex = html.indexOf('<div class="em-card', scriptElement.endIndex);
    if (cardIndex === -1) {
      break;
    }

    const cardElement = extractElement(html, cardIndex);
    if (!cardElement) {
      break;
    }

    entries.push({
      cardHtml: cardElement.content,
      jsonLd: extractJsonFromScript(scriptElement.content)
    });

    cursor = cardElement.endIndex;
  }

  if (entries.length === 0) {
    let searchIndex = html.indexOf('<div class="em-card', eventsRootIndex);
    while (searchIndex !== -1) {
      const element = extractElement(html, searchIndex);
      if (!element) {
        break;
      }
      entries.push({ cardHtml: element.content, jsonLd: null });
      searchIndex = html.indexOf('<div class="em-card', element.endIndex);
    }
  }

  return entries;
}

function parseEvent({ cardHtml, jsonLd }) {
  const titleSection = cardHtml.match(/<h3 class="em-card_title">([\s\S]*?)<\/h3>/);
  if (!titleSection) return null;
  const linkMatch = titleSection[1].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  if (!linkMatch) return null;
  const url = linkMatch[1];
  const name = stripTags(linkMatch[2]);

  const timeMatch = cardHtml.match(/<em-local-time[^>]*start="([^"]+)"[^>]*>/);
  const endMatch = cardHtml.match(/<em-local-time[^>]*end="([^"]+)"[^>]*>/);

  let startDate = null;
  let endDate = null;

  if (timeMatch) {
    const parsedStart = new Date(timeMatch[1]);
    if (!Number.isNaN(parsedStart.getTime())) {
      startDate = parsedStart.toISOString();
    }
  }

  if (endMatch) {
    const parsedEnd = new Date(endMatch[1]);
    if (!Number.isNaN(parsedEnd.getTime())) {
      endDate = parsedEnd.toISOString();
    }
  }

  const locationSection = cardHtml.match(/<p class="em-card_event-text">[\s\S]*?fa-map-marker-alt[\s\S]*?<\/p>/);
  const locationText = locationSection ? stripTags(locationSection[0]) : '';
  const location = locationText || null;

  const tagsSection = cardHtml.match(/<div class="em-list_tags">([\s\S]*?)<\/div>/);
  let tags = [];
  if (tagsSection) {
    const tagMatches = [...tagsSection[1].matchAll(/<span class="em-card_tag[^>]*">([\s\S]*?)<\/span>/g)];
    tags = tagMatches.map(match => stripTags(match[1])).filter(Boolean);
  }

  const eventIdMatch = cardHtml.match(/em-event-(\d+)/);
  const eventId = eventIdMatch ? eventIdMatch[1] : url;

  const description = jsonLd?.description ? decodeHtmlEntities(jsonLd.description).replace(/\s+/g, ' ').trim() : null;
  const structuredStart = jsonLd?.startDate ? new Date(jsonLd.startDate) : null;
  const structuredEnd = jsonLd?.endDate ? new Date(jsonLd.endDate) : null;

  if (structuredStart && !Number.isNaN(structuredStart.getTime())) {
    startDate = structuredStart.toISOString();
  }

  if (structuredEnd && !Number.isNaN(structuredEnd.getTime())) {
    endDate = structuredEnd.toISOString();
  }

  const structuredLocation = jsonLd?.location?.name ? decodeHtmlEntities(jsonLd.location.name).trim() : null;
  const latitude = jsonLd?.location?.geo?.latitude ? Number.parseFloat(jsonLd.location.geo.latitude) : null;
  const longitude = jsonLd?.location?.geo?.longitude ? Number.parseFloat(jsonLd.location.geo.longitude) : null;

  return {
    id: eventId,
    name,
    url,
    startDate: startDate ?? null,
    endDate: endDate ?? startDate ?? null,
    location: structuredLocation || location,
    description,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    tags
  };
}

function parseEvents(html) {
  const entries = extractEventEntries(html);
  const events = [];
  for (const entry of entries) {
    const event = parseEvent(entry);
    if (event) {
      events.push(event);
    }
  }
  return events;
}

function inferCategory(tags) {
  const normalized = (tags ?? []).map(tag => tag.toLowerCase());
  const matches = (candidates) => normalized.some(tag => candidates.some(candidate => tag.includes(candidate)));

  if (matches(['sport', 'athlet', 'game', 'intramural'])) {
    return 'sports';
  }

  if (matches(['career', 'job', 'intern', 'recruit', 'employment', 'network'])) {
    return 'career';
  }

  if (matches(['wellness', 'health', 'fitness', 'counsel', 'therapy', 'mindful'])) {
    return 'wellness';
  }

  if (matches(['social', 'student life', 'student affairs', 'community', 'arts', 'culture', 'entertainment', 'celebration'])) {
    return 'social';
  }

  return 'academic';
}

async function fetchEventsForDate(date) {
  const datePath = formatDatePath(date);
  let page = 1;
  let hasMore = true;
  const events = [];

  while (hasMore) {
    const { html } = await fetchPage(datePath, page);
    if (!html) {
      break;
    }

    const pageEvents = parseEvents(html);
    if (pageEvents.length === 0) {
      break;
    }

    events.push(...pageEvents);

    if (pageEvents.length < EVENTS_PER_PAGE) {
      hasMore = false;
    } else {
      page += 1;
    }
  }

  return events;
}

async function main() {
  const envFile = parseEnvFile(envPath);
  const frequencyDays = parseFrequencyDays(getEnvValue(envFile, 'SCRAPE_EVENTS_FREQUENCY_DAYS'));
  const envLastRun = getEnvValue(envFile, 'SCRAPE_EVENTS_LAST_RUN');
  const jsonLastRun = readLastScrapedAtFromJson(jsonPath);
  const { iso: lastRun, source: lastRunSource } = resolveLastRunTimestamp(envLastRun, jsonLastRun);
  const now = new Date();

  if (shouldSkipRun(lastRun, frequencyDays, now)) {
    const nextRun = calculateNextEligibleRun(lastRun, frequencyDays);
    const nextRunDisplay = nextRun ? nextRun.toISOString() : 'unknown';
    console.log(
      `Skipping scrape. Last run at ${lastRun} (source: ${lastRunSource}) which is within ${frequencyDays} day(s). ` +
      `Next eligible run after ${nextRunDisplay}.`
    );
    db.close();
    return;
  }

  if (lastRun) {
    console.log(`Running events scraper. Last run sourced from ${lastRunSource} at ${lastRun}.`);
  } else {
    console.log('Running events scraper. No previous run detected.');
  }
  console.log(`Frequency: every ${frequencyDays} day(s).`);

  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);

  let totalStored = 0;
  const aggregatedEvents = new Map();

  for (let offset = 0; offset < DAYS_TO_FETCH; offset += 1) {
    const currentDate = addDays(startDate, offset);
    let events = [];
    try {
      events = await fetchEventsForDate(currentDate);
    } catch (error) {
      console.error(`Failed to fetch events for ${currentDate.toISOString().split('T')[0]}:`, error);
      continue;
    }
    for (const event of events) {
      upsertEventStatement.run(
        event.name,
        event.startDate,
        event.location,
        JSON.stringify(event.tags),
        event.url
      );
      aggregatedEvents.set(event.url, {
        id: String(event.id),
        title: event.name,
        description: event.description,
        start: event.startDate,
        end: event.endDate,
        location: event.location,
        url: event.url,
        tags: event.tags,
        category: inferCategory(event.tags),
        lat: event.latitude,
        lng: event.longitude
      });
      totalStored += 1;
    }
    console.log(`Stored ${events.length} events for ${currentDate.toISOString().split('T')[0]}`);
  }

  const eventsArray = Array.from(aggregatedEvents.values())
    .filter((event) => Boolean(event.start))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const payload = {
    scrapedAt: now.toISOString(),
    events: eventsArray
  };

  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${eventsArray.length} events to ${jsonPath}`);

  const updates = new Map(envFile.entries);
  updates.set('SCRAPE_EVENTS_LAST_RUN', now.toISOString());
  updates.set('SCRAPE_EVENTS_FREQUENCY_DAYS', String(frequencyDays));
  writeEnvFile(envFile, updates);

  console.log(`Finished. Total events stored or updated: ${totalStored}`);
  const nextRun = calculateNextEligibleRun(now.toISOString(), frequencyDays);
  if (nextRun) {
    console.log(`Next eligible run after ${nextRun.toISOString()}`);
  }
  db.close();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
  db.close();
});
