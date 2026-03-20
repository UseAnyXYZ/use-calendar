import { useEffect, useState } from "react";
import { api, ApiError, type CalendarEvent } from "../api";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  if (allDay) {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReminder(minutes: number): string {
  if (minutes === 0) return "At start";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return `${parts.join(" ")} before`;
}

function eventStart(ev: CalendarEvent): Date {
  if (ev.occurrenceStart) return new Date(ev.isAllDay ? ev.occurrenceStart + "T00:00:00" : ev.occurrenceStart);
  if (ev.isAllDay && ev.startDate) return new Date(ev.startDate + "T00:00:00");
  if (ev.startTime) return new Date(ev.startTime);
  return new Date();
}

function groupByDate(
  events: CalendarEvent[],
): { date: string; label: string; events: CalendarEvent[] }[] {
  const groups = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const d = eventStart(ev);
    const key = d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dateKey = toDateStr(d);
    const groupKey = `${dateKey}|${key}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(ev);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, evs]) => ({
      date: key.split("|")[0],
      label: key.split("|")[1],
      events: evs,
    }));
}

export function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() => toDateStr(startOfWeek(new Date())));
  const [to, setTo] = useState(() => toDateStr(endOfWeek(new Date())));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.listEvents(from, to);
      const sorted = list.sort(
        (a, b) =>
          new Date(a.startTime ?? a.startDate ?? "").getTime() -
          new Date(b.startTime ?? b.startDate ?? "").getTime(),
      );
      setEvents(sorted);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [from, to]);

  const shiftWeek = (dir: number) => {
    const f = new Date(from);
    f.setDate(f.getDate() + dir * 7);
    setFrom(toDateStr(f));
    const t = new Date(to);
    t.setDate(t.getDate() + dir * 7);
    setTo(toDateStr(t));
  };

  const goToday = () => {
    setFrom(toDateStr(startOfWeek(new Date())));
    setTo(toDateStr(endOfWeek(new Date())));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await api.deleteEvent(id);
      setExpandedId(null);
      await fetchEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete event");
    }
  };

  const groups = groupByDate(events);

  return (
    <div className="events-page">
      <div className="events-toolbar">
        <div className="date-nav">
          <button className="btn btn-ghost" onClick={() => shiftWeek(-1)}>
            &larr;
          </button>
          <button className="btn btn-ghost" onClick={goToday}>
            Today
          </button>
          <button className="btn btn-ghost" onClick={() => shiftWeek(1)}>
            &rarr;
          </button>
          <span className="date-range-label">
            {new Date(from).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            &ndash;{" "}
            {new Date(to + "T23:59:59").toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p className="events-empty">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="events-empty">No events this week.</p>
      ) : (
        <div className="events-list">
          {groups.map((group) => (
            <div key={group.date} className="event-group">
              <h3 className="event-group-label">{group.label}</h3>
              {group.events.map((ev) => {
                const cardKey = ev.occurrenceStart ? `${ev.id}-${ev.occurrenceStart}` : ev.id;
                return (
                <div
                  key={cardKey}
                  className={`event-card ${expandedId === cardKey ? "expanded" : ""}`}
                >
                  <div
                    className="event-card-header"
                    onClick={() =>
                      setExpandedId(expandedId === cardKey ? null : cardKey)
                    }
                  >
                    <div className="event-card-main">
                      <span className="event-title">{ev.title}{ev.rrule ? " ↻" : ""}</span>
                      <span className="event-time">
                        {ev.isAllDay
                          ? "All day"
                          : (ev.occurrenceStart || ev.startTime) && (ev.occurrenceEnd || ev.endTime)
                            ? `${formatDate(ev.occurrenceStart || ev.startTime!, false)} - ${formatDate(ev.occurrenceEnd || ev.endTime!, false)}`
                            : ""}
                      </span>
                    </div>
                    {ev.location && (
                      <span className="event-location">{ev.location}</span>
                    )}
                  </div>
                  {expandedId === ev.id && (
                    <div className="event-card-details">
                      {ev.description && (
                        <p className="event-description">{ev.description}</p>
                      )}
                      {ev.reminders && ev.reminders.length > 0 && (
                        <p className="event-reminders">
                          Reminders: {ev.reminders.map((r) => formatReminder(r.minutes)).join(", ")}
                        </p>
                      )}
                      <p className="event-meta">
                        Timezone: {ev.timezone} &middot; Status: {ev.status}
                      </p>
                      <div className="event-actions">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(ev.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
