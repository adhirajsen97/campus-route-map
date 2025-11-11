export type AssistantEventDetails = {
  title: string;
  time?: string | null;
  location?: string | null;
  category?: string | null;
  tags: string[];
  url?: string | null;
  description?: string | null;
};

export type AssistantStructuredResponse = {
  summary?: string | null;
  events: AssistantEventDetails[];
  notes?: string | null;
};

export const EVENT_ASSISTANT_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "event_assistant_response",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: ["string", "null"],
          description: "High-level sentence summarizing the results for the user.",
        },
        events: {
          type: "array",
          description: "List of events that match the user's request.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "tags"],
            properties: {
              title: {
                type: "string",
                description: "Event title as it appears in the dataset.",
              },
              time: {
                type: ["string", "null"],
                description: "Human-friendly date range for the event.",
              },
              location: {
                type: ["string", "null"],
                description: "Primary location for the event if available.",
              },
              category: {
                type: ["string", "null"],
                description: "High-level category such as Social, Wellness, etc.",
              },
              tags: {
                type: "array",
                description: "Associated tags for quick scanning and filtering.",
                items: {
                  type: "string",
                },
              },
              url: {
                type: ["string", "null"],
                description: "Direct link to the event detail page if present.",
              },
              description: {
                type: ["string", "null"],
                description: "Optional short description of the event.",
              },
            },
          },
        },
        notes: {
          type: ["string", "null"],
          description: "Additional remarks or clarifications for the user.",
        },
      },
      required: ["events"],
    },
    strict: true,
  },
} as const;

export type EventAssistantResponseFormat = typeof EVENT_ASSISTANT_RESPONSE_FORMAT;
