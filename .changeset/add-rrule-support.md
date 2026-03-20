---
"@useanysh/calendar-contracts": minor
"@useanysh/calendar-cli": minor
---

Add recurring event (RRULE) support. Events can now include an RFC 5545 RRULE string for recurrence (DAILY, WEEKLY, MONTHLY, YEARLY with INTERVAL, COUNT, UNTIL, BYDAY). The API expands recurring events into individual occurrences for list queries. CLI gains `--rrule` flag on create and update commands.
