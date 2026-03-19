import { z } from "zod";

const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createEventSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    timezone: z.string().optional(),
    isAllDay: z.boolean(),
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

export const createTokenSchema = z.object({
  name: z.string().min(1).max(100),
});

export const cliAuthApproveSchema = z.object({
  code: z.string().min(1).max(100),
});
