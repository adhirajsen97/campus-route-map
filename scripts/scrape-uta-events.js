#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const BASE_URL = 'https://events.uta.edu/calendar/day';
const EVENTS_PER_PAGE = 21;
const DAYS_TO_FETCH = 14;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'data', 'events.sqlite');

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

function extractEventCards(html) {
  const cards = [];
  const eventsRootIndex = html.indexOf('id="event_results"');
  if (eventsRootIndex === -1) {
    return cards;
  }

  let searchIndex = html.indexOf('<div class="em-card', eventsRootIndex);
  while (searchIndex !== -1) {
    const element = extractElement(html, searchIndex);
    if (!element) {
      break;
    }
    cards.push(element.content);
    searchIndex = html.indexOf('<div class="em-card', element.endIndex);
  }

  return cards;
}

function parseEvent(cardHtml) {
  const titleSection = cardHtml.match(/<h3 class="em-card_title">([\s\S]*?)<\/h3>/);
  if (!titleSection) return null;
  const linkMatch = titleSection[1].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  if (!linkMatch) return null;
  const url = linkMatch[1];
  const name = stripTags(linkMatch[2]);

  const timeMatch = cardHtml.match(/<em-local-time[^>]*start="([^"]+)"[^>]*>/);
  let eventDate = null;
  if (timeMatch) {
    const parsedDate = new Date(timeMatch[1]);
    if (!Number.isNaN(parsedDate.getTime())) {
      eventDate = parsedDate.toISOString();
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

  return {
    name,
    url,
    eventDate,
    location,
    tags
  };
}

function parseEvents(html) {
  const cards = extractEventCards(html);
  const events = [];
  for (const card of cards) {
    const event = parseEvent(card);
    if (event) {
      events.push(event);
    }
  }
  return events;
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
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);

  let totalStored = 0;
  for (let offset = 0; offset < DAYS_TO_FETCH; offset += 1) {
    const currentDate = addDays(startDate, offset);
    const events = await fetchEventsForDate(currentDate);
    for (const event of events) {
      upsertEventStatement.run(
        event.name,
        event.eventDate,
        event.location,
        JSON.stringify(event.tags),
        event.url
      );
      totalStored += 1;
    }
    console.log(`Stored ${events.length} events for ${currentDate.toISOString().split('T')[0]}`);
  }

  console.log(`Finished. Total events stored or updated: ${totalStored}`);
  db.close();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
  db.close();
});
