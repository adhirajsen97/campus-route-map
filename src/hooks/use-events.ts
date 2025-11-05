import { useQuery } from "@tanstack/react-query";
import type { CampusEvent } from "@/lib/types";

type EventCategory = CampusEvent["category"];

interface RawEvent {
  id?: string;
  title?: string;
  description?: string | null;
  start?: string | null;
  end?: string | null;
  location?: string | null;
  url?: string | null;
  tags?: unknown;
  category?: EventCategory;
  lat?: number | null;
  lng?: number | null;
}

interface RawEventsResponse {
  scrapedAt?: string | null;
  events?: RawEvent[] | null;
}

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag): tag is string => tag.length > 0);
};

const toCampusEvent = (raw: RawEvent): CampusEvent | null => {
  if (!raw.title) {
    return null;
  }

  const start = parseDate(raw.start);
  if (!start) {
    return null;
  }

  const end = parseDate(raw.end) ?? start;
  const id = raw.id ?? raw.url;
  if (!id) {
    return null;
  }

  const description = typeof raw.description === "string" ? raw.description.trim() : undefined;
  const location = typeof raw.location === "string" && raw.location.trim().length > 0 ? raw.location.trim() : undefined;
  const url = typeof raw.url === "string" && raw.url.length > 0 ? raw.url : undefined;
  const category: EventCategory = raw.category ?? "academic";
  const lat = typeof raw.lat === "number" ? raw.lat : undefined;
  const lng = typeof raw.lng === "number" ? raw.lng : undefined;

  return {
    id,
    title: raw.title,
    description: description && description.length > 0 ? description : undefined,
    start,
    end,
    location,
    url,
    category,
    tags: normalizeTags(raw.tags),
    lat,
    lng,
  };
};

const fetchEvents = async (): Promise<CampusEvent[]> => {
  const response = await fetch("/api/events");
  if (!response.ok) {
    throw new Error("Failed to load events");
  }

  const payload = (await response.json()) as RawEventsResponse | RawEvent[];
  const eventsPayload = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.events)
      ? payload.events
      : [];

  return eventsPayload
    .map(toCampusEvent)
    .filter((event): event is CampusEvent => event !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
};

export const useEvents = () =>
  useQuery<CampusEvent[]>({
    queryKey: ["events"],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
