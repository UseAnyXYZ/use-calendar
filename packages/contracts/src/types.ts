export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  expiresAt: string;
}

export type EventStatus = "confirmed" | "cancelled";

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  timezone: string | null;
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDateExclusive: string | null;
  isAllDay: boolean;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export type EventSummary = CalendarEvent;

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  timezone?: string;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDateExclusive?: string;
  isAllDay: boolean;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface ApiTokenSummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CalendarFeedInfo {
  url: string;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

export interface CliAuthStartResponse {
  code: string;
  expiresAt: string;
}

export interface CliAuthPollResponse {
  status: "pending" | "completed" | "expired";
  token?: string;
  tokenName?: string;
}
