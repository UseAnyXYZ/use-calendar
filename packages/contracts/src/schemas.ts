import { z } from "zod";

const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const reminderSchema = z.object({
  minutes: z.number().int().min(0).max(40320), // max 4 weeks
});

const ALLOWED_RRULE_KEYS = new Set([
  "FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY", "BYMONTH", "WKST",
]);

export const rruleSchema = z
  .string()
  .refine((s) => s.startsWith("FREQ="), { message: "RRULE must start with FREQ=" })
  .refine(
    (s) => {
      const parts = s.split(";");
      return parts.every((p) => {
        const key = p.split("=")[0];
        return ALLOWED_RRULE_KEYS.has(key!);
      });
    },
    { message: "RRULE contains unsupported keys" },
  )
  .refine(
    (s) => {
      const hasCount = s.includes("COUNT=");
      const hasUntil = s.includes("UNTIL=");
      return !(hasCount && hasUntil);
    },
    { message: "RRULE cannot have both COUNT and UNTIL" },
  );

export const createEventSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    timezone: z.string().optional(),
    isAllDay: z.boolean(),
    rrule: rruleSchema.optional(),
    reminders: z.array(reminderSchema).max(5).optional(),
    startTime: z
      .string()
      .regex(isoDateTimeRegex, "Must be an ISO 8601 date-time string")
      .optional(),
    endTime: z
      .string()
      .regex(isoDateTimeRegex, "Must be an ISO 8601 date-time string")
      .optional(),
    startDate: z
      .string()
      .regex(dateRegex, "Must be a YYYY-MM-DD date string")
      .optional(),
    endDateExclusive: z
      .string()
      .regex(dateRegex, "Must be a YYYY-MM-DD date string")
      .optional(),
  })
  .refine(
    (data) => {
      const hasTimed = data.startTime !== undefined && data.endTime !== undefined;
      const hasAllDay =
        data.startDate !== undefined && data.endDateExclusive !== undefined;
      return (hasTimed && !hasAllDay) || (hasAllDay && !hasTimed);
    },
    {
      message:
        "Must provide either (startTime + endTime) or (startDate + endDateExclusive), but not both",
    },
  );

export const updateEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  timezone: z.string().optional(),
  isAllDay: z.boolean().optional(),
  rrule: rruleSchema.nullable().optional(),
  reminders: z.array(reminderSchema).max(5).optional(),
  startTime: z
    .string()
    .regex(isoDateTimeRegex, "Must be an ISO 8601 date-time string")
    .optional(),
  endTime: z
    .string()
    .regex(isoDateTimeRegex, "Must be an ISO 8601 date-time string")
    .optional(),
  startDate: z
    .string()
    .regex(dateRegex, "Must be a YYYY-MM-DD date string")
    .optional(),
  endDateExclusive: z
    .string()
    .regex(dateRegex, "Must be a YYYY-MM-DD date string")
    .optional(),
});

export const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const cliAuthApproveSchema = z.object({
  code: z.string().min(1).max(100),
});
