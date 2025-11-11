import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { EVENT_ASSISTANT_RESPONSE_FORMAT } from '../src/lib/event-assistant-schema';

type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const eventsPath = join(__dirname, '..', 'data', 'events.json');

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as { messages?: ChatMessage[] };
  } catch (error) {
    console.error('Failed to parse chat request body', error);
    return null;
  }
}

async function loadEventsContext() {
  try {
    const raw = await readFile(eventsPath, 'utf8');
    const fileBase64 = Buffer.from(raw, 'utf8').toString('base64');
    const parsed = JSON.parse(raw) as {
      scrapedAt?: unknown;
      events?: Array<Record<string, unknown>>;
    };
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    const scrapedAt = typeof parsed.scrapedAt === 'string' && parsed.scrapedAt.length > 0 ? parsed.scrapedAt : null;
    const formatted = events
      .map((event) => {
        if (!event || typeof event !== 'object') {
          return null;
        }
        const title = typeof event.title === 'string' ? event.title : 'Untitled event';
        const start = typeof event.start === 'string' ? event.start : 'Unknown start';
        const end = typeof event.end === 'string' ? event.end : 'Unknown end';
        const location = typeof event.location === 'string' ? event.location : 'Unknown location';
        const category = typeof event.category === 'string' ? event.category : 'Uncategorized';
        const tags = Array.isArray(event.tags)
          ? (event.tags.filter((tag) => typeof tag === 'string') as string[])
          : [];
        const url = typeof event.url === 'string' && event.url.length > 0 ? event.url : 'None';
        return `Title: ${title}\nStart: ${start}\nEnd: ${end}\nLocation: ${location}\nCategory: ${category}\nTags: ${tags.join(', ') || 'None'}\nURL: ${url}\n---`;
      })
      .filter((snippet): snippet is string => Boolean(snippet))
      .join('\n');
    const header = scrapedAt ? `Events data last updated at ${scrapedAt}.` : null;
    const snapshot = [header, formatted]
      .filter((segment): segment is string => Boolean(segment && segment.length > 0))
      .join('\n');
    return { snapshot, fileBase64 };
  } catch (error) {
    console.error('Failed to read events.json for chat context', error);
    return { snapshot: '', fileBase64: '' };
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'OpenAI API key is not configured' });
    return;
  }

  const body = await readBody(req);
  if (!body || !Array.isArray(body.messages)) {
    sendJson(res, 400, { error: 'Invalid request body: expected messages array' });
    return;
  }

  const eventsContext = await loadEventsContext();

  const now = new Date();
  const friendlyDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(now);
  const isoDate = now.toISOString();

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an Event Assistant AI. You must ONLY answer questions based on the event data provided. If a user asks about anything outside the event data, reply: "I'm sorry, I can only answer questions related to the events provided." Do not infer or invent information. Always quote or summarize directly from the provided event data. If the question cannot be answered with the available data, state that clearly.\n\nToday's date is ${friendlyDate} (ISO ${isoDate}). Use this to interpret any relative date references in the user's question and focus on the appropriate events.\n\nHere is the complete list of events you can reference:\n${eventsContext.snapshot}`,
  };

  const requestMessages: ChatMessage[] = [systemMessage, ...body.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))];

  try {
    const completionResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: requestMessages.map((message) => {
          const contentBlocks: Array<
            | { type: 'input_text'; text: string }
            | { type: 'output_text'; text: string }
            | { type: 'input_file'; filename: string; file_data: string }
          > = [];

          if (message.role === 'system' && eventsContext.fileBase64) {
            contentBlocks.push({
              type: 'input_file',
              filename: 'events.json',
              file_data: eventsContext.fileBase64,
            });
          }

          contentBlocks.push(
            message.role === 'assistant'
              ? { type: 'output_text', text: message.content }
              : { type: 'input_text', text: message.content },
          );

          return {
            role: message.role,
            content: contentBlocks,
          };
        }),
        temperature: 0.1,
        max_output_tokens: 1200,
        text: {
          format: EVENT_ASSISTANT_RESPONSE_FORMAT,
        },
      }),
    });

    if (!completionResponse.ok) {
      const errorPayload = await completionResponse.json().catch(() => null);
      console.error('OpenAI API error', completionResponse.status, errorPayload);
      sendJson(res, 502, { error: 'Failed to generate response from OpenAI' });
      return;
    }

    const completionJson = (await completionResponse.json()) as {
      output?: Array<{
        role?: string;
        content?: Array<{ type: string; text?: string }>;
      }>;
      output_text?: string;
    };

    const responseText =
      typeof completionJson.output_text === 'string'
        ? completionJson.output_text
        : completionJson.output
            ?.flatMap((item) => item.content ?? [])
            .find((content) => content.type === 'output_text' && typeof content.text === 'string')
            ?.text;

    if (!responseText) {
      sendJson(res, 502, { error: 'Invalid response from OpenAI' });
      return;
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: responseText,
    };

    sendJson(res, 200, { message: assistantMessage });
  } catch (error) {
    console.error('Unexpected error while generating chat response', error);
    sendJson(res, 500, { error: 'Unexpected error while generating response' });
  }
}

export const config = {
  runtime: 'nodejs18.x',
};
