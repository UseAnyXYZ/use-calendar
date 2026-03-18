import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type CalendarEvent, type EventInput } from "../api";

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

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function eventStart(ev: CalendarEvent): Date {
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

const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface FormState {
  title: string;
  description: string;
  location: string;
  isAllDay: boolean;
  startVal: string;
  endVal: string;
  timezone: string;
}

function emptyForm(): FormState {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    title: "",
    description: "",
    location: "",
    isAllDay: false,
    startVal: toDateTimeLocal(start.toISOString()),
    endVal: toDateTimeLocal(end.toISOString()),
    timezone: defaultTz,
  };
}

function formToInput(f: FormState): EventInput {
  if (f.isAllDay) {
    return {
      title: f.title,
      description: f.description || undefined,
      location: f.location || undefined,
      isAllDay: true,
      startDate: f.startVal,
      endDateExclusive: f.endVal,
      timezone: f.timezone || undefined,
    };
  }
  return {
    title: f.title,
    description: f.description || undefined,
    location: f.location || undefined,
    isAllDay: false,
    startTime: new Date(f.startVal).toISOString(),
    endTime: new Date(f.endVal).toISOString(),
    timezone: f.timezone || undefined,
  };
}

export function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() => toDateStr(startOfWeek(new Date())));
  const [to, setTo] = useState(() => toDateStr(endOfWeek(new Date())));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const openNewForm = () => {
    setFormData(emptyForm());
    setEditingId(null);
    setShowForm(true);
    setFormError("");
  };

  const openEditForm = (ev: CalendarEvent) => {
    setFormData({
      title: ev.title,
      description: ev.description || "",
      location: ev.location || "",
      isAllDay: ev.isAllDay,
      startVal: ev.isAllDay
        ? ev.startDate || ""
        : ev.startTime ? toDateTimeLocal(ev.startTime) : "",
      endVal: ev.isAllDay
        ? ev.endDateExclusive || ""
        : ev.endTime ? toDateTimeLocal(ev.endTime) : "",
      timezone: ev.timezone || defaultTz,
    });
    setEditingId(ev.id);
    setShowForm(true);
    setFormError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = formToInput(formData);

    try {
      if (editingId) {
        await api.updateEvent(editingId, payload);
      } else {
        await api.createEvent(payload);
      }
      closeForm();
      await fetchEvents();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
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
        <button className="btn btn-primary" onClick={openNewForm}>
          + New Event
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Event" : "New Event"}</h3>
            <form onSubmit={handleSave} className="event-form">
              {formError && <div className="form-error">{formError}</div>}
              <label className="form-label">
                Title
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  autoFocus
                />
              </label>
              <label className="form-label">
                Description
                <textarea
                  className="form-input form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </label>
              <label className="form-label">
                Location
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </label>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={formData.isAllDay}
                  onChange={(e) =>
                    setFormData({ ...formData, isAllDay: e.target.checked })
                  }
                />
                All day
              </label>
              <div className="form-row">
                <label className="form-label">
                  Start
                  <input
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    className="form-input"
                    value={formData.startVal}
                    onChange={(e) =>
                      setFormData({ ...formData, startVal: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="form-label">
                  End
                  <input
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    className="form-input"
                    value={formData.endVal}
                    onChange={(e) =>
                      setFormData({ ...formData, endVal: e.target.value })
                    }
                    required
                  />
                </label>
              </div>
              <label className="form-label">
                Timezone
                <input
                  type="text"
                  className="form-input"
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="events-empty">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="events-empty">No events this week.</p>
      ) : (
        <div className="events-list">
          {groups.map((group) => (
            <div key={group.date} className="event-group">
              <h3 className="event-group-label">{group.label}</h3>
              {group.events.map((ev) => (
                <div
                  key={ev.id}
                  className={`event-card ${expandedId === ev.id ? "expanded" : ""}`}
                >
                  <div
                    className="event-card-header"
                    onClick={() =>
                      setExpandedId(expandedId === ev.id ? null : ev.id)
                    }
                  >
                    <div className="event-card-main">
                      <span className="event-title">{ev.title}</span>
                      <span className="event-time">
                        {ev.isAllDay
                          ? "All day"
                          : ev.startTime && ev.endTime
                            ? `${formatDate(ev.startTime, false)} - ${formatDate(ev.endTime, false)}`
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
                      <p className="event-meta">
                        Timezone: {ev.timezone} &middot; Status: {ev.status}
                      </p>
                      <div className="event-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditForm(ev)}
                        >
                          Edit
                        </button>
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
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
