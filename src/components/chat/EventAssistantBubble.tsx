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
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  Bot,
  CalendarDays,
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

const ChatWindow = ({ corner, onClose }: ChatWindowProps) => {
  const { data: events, isLoading } = useEvents();
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

      const payloadMessages = [...messagesRef.current, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: payloadMessages }),
        });

        if (!response.ok) {
          throw new Error(`Chat endpoint responded with ${response.status}`);
        }

        const data = (await response.json()) as {
          message?: { role: ChatRole; content: string };
        };

        if (!data.message || data.message.role !== "assistant") {
          throw new Error("Assistant response missing");
        }

        const assistantTimestamp = Date.now();
        const assistantMessage: ChatMessage = {
          id: `assistant-${assistantTimestamp}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: data.message.content.trim(),
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
    [isSending],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage(draft);
    },
    [draft, sendMessage],
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
        "fixed z-[60] flex h-[min(26rem,70vh)] w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur",
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
                    {message.content.split("\n").map((line, index) => (
                      <p key={`${message.id}-${index}`} className={index > 0 ? "mt-1.5" : undefined}>
                        {line.trim()}
                      </p>
                    ))}
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

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            Instruction guardrails: “You are an Event Assistant AI. You must ONLY answer questions based on the
            event data provided. If a user asks about anything outside the event data, reply: "I'm sorry, I can
            only answer questions related to the events provided." Do not infer or invent information.”
          </div>
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

