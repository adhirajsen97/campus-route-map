import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  Bot,
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  SendHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useEvents } from "@/hooks/use-events";
import {
  EVENT_ASSISTANT_RESPONSE_FORMAT,
  type AssistantEventDetails,
  type AssistantStructuredResponse,
} from "@/lib/event-assistant-schema";
import { cn } from "@/lib/utils";

const BUBBLE_MARGIN = 24;
const BUBBLE_SIZE = 64;
const CHAT_GAP = 16;

const QUICK_PROMPTS = [
  "What events are happening today?",
  "Show me engineering events this week",
  "Which events are on campus tomorrow?",
  "List student life events for this weekend",
];

type ChatCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type Point = {
  x: number;
  y: number;
};

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

type DragSnapshot = {
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const DEFAULT_DRAG_SNAPSHOT: DragSnapshot = {
  offsetX: 0,
  offsetY: 0,
  startX: 0,
  startY: 0,
  moved: false,
};

interface ChatWindowProps {
  corner: ChatCorner;
  onClose: () => void;
}

const encodeBase64 = (value: string) => {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  const globalBuffer = (globalThis as { Buffer?: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(value, "utf8").toString("base64");
  }

  throw new Error("Base64 encoding is not supported in this environment.");
};

const stripJsonWrapper = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```json\s*/i, "").replace(/^```/, "");
    const closingFenceIndex = withoutFence.lastIndexOf("```");
    if (closingFenceIndex >= 0) {
      return withoutFence.slice(0, closingFenceIndex).trim();
    }
    return withoutFence.trim();
  }
  return trimmed;
};

const autoCloseJson = (value: string) => {
  const sanitized = value.trim();
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let index = 0; index < sanitized.length; index += 1) {
    const char = sanitized[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "[") {
      stack.push("]");
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = stack.pop();
      if (!expected || expected !== char) {
        return sanitized;
      }
    }
  }

  if (stack.length === 0) {
    return sanitized;
  }

  return sanitized + stack.reverse().join("");
};

const toAssistantEventDetails = (value: unknown): AssistantEventDetails | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const event = value as Record<string, unknown>;
  const title = typeof event.title === "string" ? event.title.trim() : "";
  if (!title) {
    return null;
  }

  const time = typeof event.time === "string" ? event.time.trim() : undefined;
  const location = typeof event.location === "string" ? event.location.trim() : null;
  const category = typeof event.category === "string" ? event.category.trim() : null;
  const description = typeof event.description === "string" ? event.description.trim() : undefined;
  const url = typeof event.url === "string" && event.url.trim().length > 0 ? event.url.trim() : undefined;

  const tags: string[] = Array.isArray(event.tags)
    ? event.tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag): tag is string => tag.length > 0)
    : [];

  return {
    title,
    time,
    location,
    category,
    tags,
    url,
    description,
  };
};

const parseAssistantResponse = (content: string): AssistantStructuredResponse | null => {
  const sanitized = stripJsonWrapper(content);
  const start = sanitized.indexOf("{");
  const end = sanitized.lastIndexOf("}");

  if (start < 0 || end <= start) {
    return null;
  }

  const candidate = sanitized.slice(start, end + 1);

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : undefined;
    const notes = typeof parsed.notes === "string" ? parsed.notes.trim() : undefined;
    const eventsValue = Array.isArray(parsed.events) ? parsed.events : [];
    const events = eventsValue
      .map((item) => toAssistantEventDetails(item))
      .filter((item): item is AssistantEventDetails => item !== null);

    return {
      summary: summary ?? undefined,
      notes: notes ?? undefined,
      events,
    };
  } catch (error) {
    console.error("Failed to parse assistant response", error);
    const repaired = autoCloseJson(candidate);
    if (repaired !== candidate) {
      try {
        const parsed = JSON.parse(repaired) as Record<string, unknown>;
        const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : undefined;
        const notes = typeof parsed.notes === "string" ? parsed.notes.trim() : undefined;
        const eventsValue = Array.isArray(parsed.events) ? parsed.events : [];
        const events = eventsValue
          .map((item) => toAssistantEventDetails(item))
          .filter((item): item is AssistantEventDetails => item !== null);

        return {
          summary: summary ?? undefined,
          notes: notes ?? undefined,
          events,
        };
      } catch (repairError) {
        console.error("Failed to parse repaired assistant response", repairError);
      }
    }
    return null;
  }
};

const ChatWindow = ({ corner, onClose }: ChatWindowProps) => {
  const { data: events, isLoading } = useEvents();
  const eventsFileBase64Ref = useRef<string | null>(null);
  const eventsFilePromiseRef = useRef<Promise<string | null> | null>(null);

  const ensureEventsFileBase64 = useCallback(async () => {
    if (eventsFileBase64Ref.current) {
      return eventsFileBase64Ref.current;
    }

    if (eventsFilePromiseRef.current) {
      return eventsFilePromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error(`Failed to load events.json: ${response.status}`);
        }
        const text = await response.text();
        const base64 = encodeBase64(text);
        eventsFileBase64Ref.current = base64;
        return base64;
      } catch (error) {
        console.error("Failed to load events.json for assistant", error);
        return null;
      }
    })();

    eventsFilePromiseRef.current = promise;
    try {
      const result = await promise;
      return result;
    } finally {
      eventsFilePromiseRef.current = null;
    }
  }, []);

  useEffect(() => {
    void ensureEventsFileBase64();
  }, [ensureEventsFileBase64]);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "assistant-intro",
      role: "assistant",
      content:
        "Hi! I'm your UTA Event guide. I can only answer questions about the verified events in our database. Ask me about dates, locations, or tags and I'll summarize the matching events for you.",
      createdAt: Date.now(),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);
  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages],
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const anchorStyle = useMemo<CSSProperties>(() => {
    const offset = BUBBLE_MARGIN + BUBBLE_SIZE + CHAT_GAP;
    switch (corner) {
      case "top-left":
        return { top: offset, left: BUBBLE_MARGIN };
      case "top-right":
        return { top: offset, right: BUBBLE_MARGIN };
      case "bottom-left":
        return { bottom: offset, left: BUBBLE_MARGIN };
      case "bottom-right":
      default:
        return { bottom: offset, right: BUBBLE_MARGIN };
    }
  }, [corner]);

  const totalEvents = events?.length ?? 0;
  const locations = useMemo(() => {
    if (!events) return 0;
    const set = new Set<string>();
    events.forEach((event) => {
      if (event.location) {
        set.add(event.location);
      }
    });
    return set.size;
  }, [events]);

  const tags = useMemo(() => {
    if (!events) return 0;
    const set = new Set<string>();
    events.forEach((event) => {
      event.tags.forEach((tag) => set.add(tag));
    });
    return set.size;
  }, [events]);

  const categories = useMemo(() => {
    if (!events) return 0;
    const set = new Set<string>();
    events.forEach((event) => set.add(event.category));
    return set.size;
  }, [events]);

  const currentDateInfo = useMemo(() => {
    const now = new Date();
    const friendlyDate = new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(now);

    return {
      iso: now.toISOString(),
      friendly: friendlyDate,
    };
  }, []);

  const eventsSnapshot = useMemo(() => {
    if (!events || events.length === 0) {
      return "No events data is currently available.";
    }

    return events
      .map((event) => {
        const start = event.start.toISOString();
        const end = event.end.toISOString();
        const location = event.location ?? "Unknown location";
        const tags = event.tags && event.tags.length > 0 ? event.tags.join(", ") : "None";
        const url = event.url ?? "None";

        return `Title: ${event.title}\nStart: ${start}\nEnd: ${end}\nLocation: ${location}\nCategory: ${event.category}\nTags: ${tags}\nURL: ${url}\n---`;
      })
      .join("\n");
  }, [events]);

  const systemPrompt = useMemo(
    () =>
      [
        "You are an Event Assistant AI. You must ONLY answer questions based on the event data provided.",
        "If a user asks about anything outside the event data, reply: \"I'm sorry, I can only answer questions related to the events provided.\"",
        "Do not infer or invent information. Always quote or summarize directly from the provided event data.",
        "If the question cannot be answered with the available data, state that clearly.",
        `Today's date is ${currentDateInfo.friendly} (ISO ${currentDateInfo.iso}). Use this to interpret any relative date references from the user and to filter the event schedule appropriately.`,
        "You must respond using a single JSON object with this structure: { \"summary\": string, \"events\": [ { \"title\": string, \"time\": string, \"location\": string | null, \"category\": string | null, \"tags\": string[], \"url\": string | null, \"description\": string | null } ], \"notes\": string | null }.",
        "Always include an array for \"events\" even when there are no results. When an event includes a URL in the data, place it in the \"url\" field; otherwise, set \"url\" to null.",
        "Format the \"time\" field as a human-readable range like \"Nov 9, 2025 • 8:30 PM – 10:00 PM\". Use sentence case for the \"summary\" and \"notes\" fields.",
        "Do not wrap the JSON in markdown code fences and do not include any text outside of the JSON object.",
        "",
        "Here is the complete list of events you can reference:",
        eventsSnapshot,
      ].join("\n"),
    [currentDateInfo, eventsSnapshot],
  );

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || isSending) {
        return;
      }

      const timestamp = Date.now();
      const userMessage: ChatMessage = {
        id: `user-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        content,
        createdAt: timestamp,
      };

      setMessages((previous) => [...previous, userMessage]);
      setDraft("");
      setErrorMessage(null);
      setIsSending(true);

      const eventsFileBase64 = await ensureEventsFileBase64();
      if (!eventsFileBase64) {
        setErrorMessage("Unable to load the latest events data. Please try again later.");
        setIsSending(false);
        return;
      }

      const payloadMessages = [...messagesRef.current, userMessage].map((message) => {
        const contentBlock =
          message.role === "assistant"
            ? ({ type: "output_text" as const, text: message.content } satisfies {
                type: "output_text";
                text: string;
              })
            : ({ type: "input_text" as const, text: message.content } satisfies {
                type: "input_text";
                text: string;
              });

        return {
          role: message.role,
          content: [contentBlock],
        };
      });

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      if (!apiKey) {
        console.error("VITE_OPENAI_API_KEY is not configured for the event assistant");
        setErrorMessage(
          "Event assistant is not configured. Please contact the site administrator to add an OpenAI API key.",
        );
        setIsSending(false);
        return;
      }

      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            input: [
              {
                role: "system",
                content: [
                  {
                    type: "input_file" as const,
                    filename: "events.json",
                    file_data: eventsFileBase64,
                  },
                  {
                    type: "input_text" as const,
                    text: systemPrompt,
                  },
                ],
              },
              ...payloadMessages,
            ],
            temperature: 0.1,
            max_output_tokens: 1200,
            response_format: EVENT_ASSISTANT_RESPONSE_FORMAT,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          console.error("OpenAI API error", response.status, errorPayload);
          throw new Error(`OpenAI API responded with ${response.status}`);
        }

        const data = (await response.json()) as {
          output?: Array<{
            role?: string;
            content?: Array<{ type: string; text?: string }>;
          }>;
          output_text?: string;
        };

        const responseText =
          typeof data.output_text === "string"
            ? data.output_text
            : data.output
                ?.flatMap((item) => item.content ?? [])
                .find((content) => content.type === "output_text" && typeof content.text === "string")
                ?.text;

        if (!responseText) {
          throw new Error("Assistant response missing");
        }

        const trimmedContent = responseText.trim();

        if (!trimmedContent) {
          throw new Error("Assistant response empty");
        }

        const assistantTimestamp = Date.now();
        const assistantMessage: ChatMessage = {
          id: `assistant-${assistantTimestamp}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: trimmedContent,
          createdAt: assistantTimestamp,
        };

        setMessages((previous) => [...previous, assistantMessage]);
      } catch (error) {
        console.error("Failed to send message to event assistant", error);
        setErrorMessage(
          "Sorry, something went wrong while contacting the event assistant. Please try again.",
        );
      } finally {
        setIsSending(false);
      }
    },
    [ensureEventsFileBase64, isSending, systemPrompt],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage(draft);
    },
    [draft, sendMessage],
  );

  const handleDraftKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      event.preventDefault();

      if (isSending || draft.trim().length === 0) {
        return;
      }

      void sendMessage(draft);
    },
    [draft, isSending, sendMessage],
  );

  const handlePromptSelect = useCallback(
    (prompt: string) => {
      setDraft(prompt);
      if (!isSending) {
        void sendMessage(prompt);
      }
    },
    [isSending, sendMessage],
  );

  return (
    <div
      id="event-assistant-window"
      className={cn(
        "fixed z-[60] flex h-[min(34rem,80vh)] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur",
        "ring-1 ring-black/5",
        corner.startsWith("top") ? "origin-top" : "origin-bottom",
      )}
      style={anchorStyle}
      role="dialog"
      aria-label="UTA Event assistant chat window"
    >
      <div className="flex items-start gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">UTA Event Assistant</h2>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Beta
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Ask about upcoming campus events by date, location, category, or tags.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close chat</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-4">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const assistantResponse = isAssistant ? parseAssistantResponse(message.content) : null;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isAssistant ? "items-start" : "items-end justify-end",
                  )}
                >
                  {isAssistant ? (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" aria-hidden="true" />
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl border border-border/60 bg-background/95 p-3 text-sm text-foreground shadow-sm",
                      isAssistant ? "rounded-tl-sm" : "rounded-tr-sm bg-primary text-primary-foreground",
                    )}
                  >
                    {assistantResponse ? (
                      <div className="space-y-3">
                        {assistantResponse.summary ? (
                          <p className="text-sm font-medium text-foreground">{assistantResponse.summary}</p>
                        ) : null}
                        {assistantResponse.events.length > 0 ? (
                          <div className="space-y-3">
                            {assistantResponse.events.map((event, eventIndex) => (
                              <div
                                key={`${message.id}-${eventIndex}-${event.title}`}
                                className="rounded-lg border border-border/60 bg-muted/20 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                                    {event.time ? (
                                      <p className="mt-1 text-xs text-muted-foreground">{event.time}</p>
                                    ) : null}
                                    {event.location ? (
                                      <p className="mt-1 text-xs text-muted-foreground">{event.location}</p>
                                    ) : null}
                                  </div>
                                  {event.url ? (
                                    <a
                                      href={event.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/20"
                                    >
                                      View event
                                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                    </a>
                                  ) : null}
                                </div>
                                {event.description ? (
                                  <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {event.category ? (
                                    <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                      {event.category}
                                    </span>
                                  ) : null}
                                  {event.tags.map((tag) => (
                                    <span
                                      key={`${message.id}-${eventIndex}-${tag}`}
                                      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No matching events were found in the current schedule.
                          </p>
                        )}
                        {assistantResponse.notes ? (
                          <p className="text-xs text-muted-foreground">{assistantResponse.notes}</p>
                        ) : null}
                      </div>
                    ) : (
                      message.content.split("\n").map((line, index) => (
                        <p key={`${message.id}-${index}`} className={index > 0 ? "mt-1.5" : undefined}>
                          {line.trim()}
                        </p>
                      ))
                    )}
                  </div>
                  {!isAssistant ? (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-xs font-semibold">You</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {isSending ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating response...
              </div>
            ) : null}
            <div ref={endOfMessagesRef} />
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {!hasUserMessages ? (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Knowledge base snapshot
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-primary/90">
                <li className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {isLoading ? "Loading events..." : `${totalEvents} upcoming events tracked`}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {isLoading ? "Gathering locations" : `${locations} unique campus locations`}
                </li>
                <li className="flex items-center gap-2">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  {isLoading ? "Collecting tags" : `${tags} descriptive tags across ${categories} categories`}
                </li>
              </ul>
            </div>
          ) : null}

          {!hasUserMessages ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick prompts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-full bg-background/90 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={() => handlePromptSelect(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border/60 bg-background/80 px-4 py-3">
        <label htmlFor="event-assistant-input" className="sr-only">
          Ask the UTA Event Assistant a question
        </label>
        <Textarea
          id="event-assistant-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="Ask about campus events..."
          className="min-h-[80px] resize-none bg-background/80 text-sm"
          disabled={isSending}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{isSending ? "Waiting for the assistant to respond..." : "Responses stay focused on verified UTA events."}</span>
          <Button
            type="submit"
            size="sm"
            className="gap-1"
            disabled={isSending || draft.trim().length === 0}
          >
            Send
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export const EventAssistantBubble = () => {
  const bubbleRef = useRef<HTMLButtonElement | null>(null);
  const dragSnapshot = useRef<DragSnapshot>({ ...DEFAULT_DRAG_SNAPSHOT });
  const isDraggingRef = useRef(false);

  const [position, setPosition] = useState<Point>(() => {
    if (typeof window === "undefined") {
      return { x: BUBBLE_MARGIN, y: BUBBLE_MARGIN };
    }

    return {
      x: window.innerWidth - BUBBLE_SIZE - BUBBLE_MARGIN,
      y: window.innerHeight - BUBBLE_SIZE - BUBBLE_MARGIN,
    };
  });
  const [corner, setCorner] = useState<ChatCorner>("bottom-right");
  const [isDragging, setIsDragging] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const clampPosition = useCallback((x: number, y: number): Point => {
    if (typeof window === "undefined") {
      return { x, y };
    }

    const maxX = window.innerWidth - BUBBLE_SIZE - BUBBLE_MARGIN;
    const maxY = window.innerHeight - BUBBLE_SIZE - BUBBLE_MARGIN;

    return {
      x: Math.min(Math.max(x, BUBBLE_MARGIN), Math.max(BUBBLE_MARGIN, maxX)),
      y: Math.min(Math.max(y, BUBBLE_MARGIN), Math.max(BUBBLE_MARGIN, maxY)),
    };
  }, []);

  const getCornerPosition = useCallback(
    (targetCorner: ChatCorner): Point => {
      if (typeof window === "undefined") {
        return { x: BUBBLE_MARGIN, y: BUBBLE_MARGIN };
      }

      const horizontal = targetCorner.endsWith("right") ? "right" : "left";
      const vertical = targetCorner.startsWith("bottom") ? "bottom" : "top";

      const x =
        horizontal === "right"
          ? window.innerWidth - BUBBLE_SIZE - BUBBLE_MARGIN
          : BUBBLE_MARGIN;
      const y =
        vertical === "bottom"
          ? window.innerHeight - BUBBLE_SIZE - BUBBLE_MARGIN
          : BUBBLE_MARGIN;

      return clampPosition(x, y);
    },
    [clampPosition],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      const { offsetX, offsetY, startX, startY } = dragSnapshot.current;
      const rawX = event.clientX - offsetX;
      const rawY = event.clientY - offsetY;
      const nextPosition = clampPosition(rawX, rawY);

      if (!dragSnapshot.current.moved) {
        const deltaX = Math.abs(event.clientX - startX);
        const deltaY = Math.abs(event.clientY - startY);
        if (deltaX > 3 || deltaY > 3) {
          dragSnapshot.current.moved = true;
        }
      }

      setPosition(nextPosition);
    },
    [clampPosition],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);

    if (typeof window === "undefined") {
      return;
    }

    const bubbleRect = bubbleRef.current?.getBoundingClientRect();
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    if (bubbleRect) {
      const bubbleCenterX = bubbleRect.left + bubbleRect.width / 2;
      const bubbleCenterY = bubbleRect.top + bubbleRect.height / 2;

      const vertical = bubbleCenterY < viewportCenterY ? "top" : "bottom";
      const horizontal = bubbleCenterX < viewportCenterX ? "left" : "right";
      const nextCorner = `${vertical}-${horizontal}` as ChatCorner;

      setCorner(nextCorner);
      setPosition(getCornerPosition(nextCorner));
    }

    dragSnapshot.current = { ...DEFAULT_DRAG_SNAPSHOT };
  },
  [getCornerPosition, handlePointerMove],
);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      const rect = bubbleRef.current?.getBoundingClientRect();
      dragSnapshot.current = {
        offsetX: rect ? event.clientX - rect.left : BUBBLE_SIZE / 2,
        offsetY: rect ? event.clientY - rect.top : BUBBLE_SIZE / 2,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };

      isDraggingRef.current = true;
      setIsDragging(true);

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp],
  );

  const handleBubbleClick = useCallback(() => {
    if (dragSnapshot.current.moved) {
      dragSnapshot.current = { ...DEFAULT_DRAG_SNAPSHOT };
      return;
    }

    setIsChatOpen((previous) => !previous);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setPosition(getCornerPosition(corner));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [corner, getCornerPosition]);

  useEffect(() => {
    if (!isChatOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsChatOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatOpen]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed top-0 left-0 z-50",
          isDragging ? "transition-none" : "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      >
        <button
          ref={bubbleRef}
          type="button"
          onPointerDown={handlePointerDown}
          onClick={handleBubbleClick}
          className={cn(
            "pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl",
            "border border-white/30",
            "cursor-grab active:cursor-grabbing",
            isDragging ? "scale-105" : "hover:scale-105",
            "transition-transform duration-150 ease-out",
          )}
          aria-label="Open UTA Event Assistant chat"
          aria-haspopup="dialog"
          aria-expanded={isChatOpen}
          aria-controls="event-assistant-window"
        >
          <Bot className="h-8 w-8" aria-hidden="true" />
          <span className="absolute -top-2 right-0 flex h-5 min-w-[2.5rem] items-center justify-center rounded-full bg-background px-2 text-[11px] font-semibold uppercase tracking-wide text-primary shadow-sm">
            AI
          </span>
        </button>
      </div>

      {isChatOpen ? <ChatWindow corner={corner} onClose={() => setIsChatOpen(false)} /> : null}
    </>
  );
};

