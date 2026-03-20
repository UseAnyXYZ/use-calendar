# @useanysh/calendar-contracts

## 0.1.0

### Minor Changes

- 98f0c27: Add recurring event (RRULE) support. Events can now include an RFC 5545 RRULE string for recurrence (DAILY, WEEKLY, MONTHLY, YEARLY with INTERVAL, COUNT, UNTIL, BYDAY). The API expands recurring events into individual occurrences for list queries. CLI gains `--rrule` flag on create and update commands.

## 0.0.2

### Patch Changes

- a1b1444: Add browser-based CLI authentication: `use-calendar auth login` opens the web UI for login/register and automatically provisions a PAT
