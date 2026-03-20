import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// API Tokens
// ---------------------------------------------------------------------------
export const apiTokens = sqliteTable(
  "api_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: integer("created_at").notNull(),
    lastUsedAt: integer("last_used_at"),
  },
  (table) => [index("api_tokens_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Calendars
// ---------------------------------------------------------------------------
export const calendars = sqliteTable(
  "calendars",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull().default("My Calendar"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("calendars_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Calendar Feeds
// ---------------------------------------------------------------------------
export const calendarFeeds = sqliteTable("calendar_feeds", {
  id: text("id").primaryKey(),
  calendarId: text("calendar_id")
    .notNull()
    .unique()
    .references(() => calendars.id),
  feedTokenHash: text("feed_token_hash").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// CLI Auth Sessions
// ---------------------------------------------------------------------------
export const cliAuthSessions = sqliteTable(
  "cli_auth_sessions",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    status: text("status").notNull().default("pending"),
    tokenValue: text("token_value"),
    deviceName: text("device_name"),
    userId: text("user_id").references(() => users.id),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("cli_auth_sessions_code_idx").on(table.code)],
);

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    calendarId: text("calendar_id")
      .notNull()
      .references(() => calendars.id),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    timezone: text("timezone"),
    startTime: integer("start_time"),
    endTime: integer("end_time"),
    startDate: text("start_date"),
    endDateExclusive: text("end_date_exclusive"),
    isAllDay: integer("is_all_day").notNull().default(0),
    reminders: text("reminders"),
    status: text("status").notNull().default("confirmed"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("events_calendar_start_time_idx").on(
      table.calendarId,
      table.startTime,
    ),
    index("events_calendar_start_date_idx").on(
      table.calendarId,
      table.startDate,
    ),
    index("events_calendar_updated_at_idx").on(
      table.calendarId,
      table.updatedAt,
    ),
  ],
);
