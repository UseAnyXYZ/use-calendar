import type {
  UserProfile,
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  ApiTokenSummary,
  CalendarFeedInfo,
  ApiError,
} from "@useanysh/calendar-contracts";
import { loadConfig } from "./config.js";

const DEFAULT_BASE_URL = "http://localhost:8787";

export class ApiClient {
  private token: string;
  private baseUrl: string;

  constructor(token?: string, baseUrl?: string) {
    const config = loadConfig();
    this.token = token ?? config.apiToken ?? "";
    this.baseUrl = baseUrl ?? config.apiBaseUrl ?? DEFAULT_BASE_URL;

    if (!this.token) {
      throw new Error(
        "No API token configured. Run `use-calendar auth login --token <PAT>` to authenticate."
      );
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as ApiError;
        if (errorBody.message) {
          errorMessage = `${errorBody.message} (${errorBody.code})`;
        }
      } catch {
        // ignore parse errors; use default message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async me(): Promise<UserProfile> {
    return this.request<UserProfile>("GET", "/api/me");
  }

  async listEvents(from?: string, to?: string, includeCancelled?: boolean): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (includeCancelled) params.set("includeCancelled", "true");
    const query = params.toString();
    const path = `/api/events${query ? `?${query}` : ""}`;
    return this.request<CalendarEvent[]>("GET", path);
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    return this.request<CalendarEvent>("POST", "/api/events", input);
  }

  async updateEvent(id: string, input: UpdateEventInput): Promise<CalendarEvent> {
    return this.request<CalendarEvent>("PATCH", `/api/events/${id}`, input);
  }

  async deleteEvent(id: string): Promise<void> {
    return this.request<void>("DELETE", `/api/events/${id}`);
  }

  async listTokens(): Promise<ApiTokenSummary[]> {
    return this.request<ApiTokenSummary[]>("GET", "/api/tokens");
  }

  async createToken(name: string): Promise<ApiTokenSummary & { token: string }> {
    return this.request<ApiTokenSummary & { token: string }>("POST", "/api/tokens", { name });
  }

  async deleteToken(id: string): Promise<void> {
    return this.request<void>("DELETE", `/api/tokens/${id}`);
  }

  async getFeedInfo(): Promise<CalendarFeedInfo> {
    return this.request<CalendarFeedInfo>("GET", "/api/calendar-feed");
  }

  async rotateFeed(): Promise<CalendarFeedInfo> {
    return this.request<CalendarFeedInfo>("POST", "/api/calendar-feed/rotate");
  }
}
