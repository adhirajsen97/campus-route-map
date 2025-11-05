import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const eventsPath = join(__dirname, '..', 'data', 'events.json');

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readEventsFile() {
  try {
    const raw = await readFile(eventsPath, 'utf8');
    return raw;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return JSON.stringify({ scrapedAt: null, events: [] });
    }
    throw error;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const payload = await readEventsFile();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    if (method === 'HEAD') {
      res.end();
      return;
    }
    res.end(payload);
  } catch (error) {
    console.error('Failed to load events.json', error);
    sendJson(res, 500, { error: 'Failed to load events data' });
  }
}

export const config = {
  runtime: 'nodejs18.x'
};
