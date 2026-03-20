export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface User {
  id: string;
  email: string;
}

export interface Reminder {
  minutes: number;
}

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
  status: string;
  reminders: Reminder[];
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  title: string;
  description?: string;
  location?: string;
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDateExclusive?: string;
  timezone?: string;
  reminders?: Reminder[];
}

export interface Token {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  createdAt: string;
}

export interface FeedInfo {
  url: string;
  hasToken: boolean;
  calendarName: string;
  createdAt: string;
}

export const api = {
  register(email: string, password: string) {
    return apiFetch<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, password: string) {
    return apiFetch<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return apiFetch<void>("/api/auth/logout", { method: "POST" });
  },

  me() {
    return apiFetch<User>("/api/me");
  },

  listEvents(from: string, to: string, includeCancelled?: boolean) {
    const params = new URLSearchParams({ from, to });
    if (includeCancelled) params.set("includeCancelled", "true");
    return apiFetch<CalendarEvent[]>(`/api/events?${params}`);
  },

  createEvent(input: EventInput) {
    return apiFetch<CalendarEvent>("/api/events", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateEvent(id: string, input: Partial<EventInput>) {
    return apiFetch<CalendarEvent>(`/api/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteEvent(id: string) {
    return apiFetch<void>(`/api/events/${id}`, { method: "DELETE" });
  },

  listTokens() {
    return apiFetch<Token[]>("/api/tokens");
  },

  deleteToken(id: string) {
    return apiFetch<void>(`/api/tokens/${id}`, { method: "DELETE" });
  },

  getCalendar() {
    return apiFetch<CalendarInfo>("/api/calendar");
  },

  renameCalendar(name: string) {
    return apiFetch<CalendarInfo>("/api/calendar", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  getFeedInfo() {
    return apiFetch<FeedInfo>("/api/calendar-feed");
  },

  rotateFeed() {
    return apiFetch<FeedInfo>("/api/calendar-feed/rotate", { method: "POST" });
  },

  cliAuthCheck(code: string) {
    return apiFetch<{ status: string }>(`/api/auth/cli/poll?code=${encodeURIComponent(code)}`);
  },

  cliAuthApprove(code: string) {
    return apiFetch<{ success: boolean }>("/api/auth/cli/approve", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};
