import { useEffect, useState } from "react";
import { api, ApiError, type User, type Token, type FeedInfo } from "../api";

interface Props {
  user: User;
  onLogout: () => void;
}

export function SettingsPage({ user, onLogout }: Props) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenError, setTokenError] = useState("");
  const [tokenLoading, setTokenLoading] = useState(true);

  const [calendarName, setCalendarName] = useState("");
  const [calendarNameDraft, setCalendarNameDraft] = useState("");
  const [calendarNameSaving, setCalendarNameSaving] = useState(false);
  const [calendarNameError, setCalendarNameError] = useState("");
  const [calendarNameSuccess, setCalendarNameSuccess] = useState(false);

  const [feed, setFeed] = useState<FeedInfo | null>(null);
  const [showFeedUrl, setShowFeedUrl] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [feedLoading, setFeedLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchTokens = async () => {
    setTokenLoading(true);
    try {
      const list = await api.listTokens();
      setTokens(list);
    } catch {
      setTokenError("Failed to load tokens");
    } finally {
      setTokenLoading(false);
    }
  };

  const fetchCalendar = async () => {
    try {
      const cal = await api.getCalendar();
      setCalendarName(cal.name);
      setCalendarNameDraft(cal.name);
    } catch {
      // ignore
    }
  };

  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      const res = await api.getFeedInfo();
      setFeed(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setFeed(null);
      } else {
        setFeedError("Failed to load feed info");
      }
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
    fetchCalendar();
    fetchFeed();
  }, []);

  const handleRenameCalendar = async () => {
    const trimmed = calendarNameDraft.trim();
    if (!trimmed || trimmed === calendarName) return;
    setCalendarNameSaving(true);
    setCalendarNameError("");
    setCalendarNameSuccess(false);
    try {
      const cal = await api.renameCalendar(trimmed);
      setCalendarName(cal.name);
      setCalendarNameDraft(cal.name);
      setCalendarNameSuccess(true);
      setTimeout(() => setCalendarNameSuccess(false), 2000);
    } catch (err) {
      setCalendarNameError(
        err instanceof ApiError ? err.message : "Failed to rename calendar",
      );
    } finally {
      setCalendarNameSaving(false);
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm("Delete this token? Any integrations using it will stop working."))
      return;
    try {
      await api.deleteToken(id);
      await fetchTokens();
    } catch (err) {
      setTokenError(
        err instanceof ApiError ? err.message : "Failed to delete token",
      );
    }
  };

  const handleRotateFeed = async () => {
    if (
      feed &&
      !confirm(
        "Regenerate your feed URL? The old URL will stop working immediately.",
      )
    )
      return;
    setFeedError("");
    try {
      const res = await api.rotateFeed();
      setFeed(res);
      setShowFeedUrl(true);
    } catch (err) {
      setFeedError(
        err instanceof ApiError ? err.message : "Failed to rotate feed",
      );
    }
  };

  const copyFeedUrl = async () => {
    if (!feed?.url) return;
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = feed.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="settings-page">
      <section className="settings-section">
        <h2>Account</h2>
        <div className="settings-row">
          <span className="settings-label">Email</span>
          <span className="settings-value">{user.email}</span>
        </div>
        <button className="btn btn-danger" onClick={onLogout}>
          Sign out
        </button>
      </section>

      <section className="settings-section">
        <h2>Calendar</h2>
        <p className="settings-description">
          Change the name of your calendar. This name appears in the ICS feed.
        </p>
        {calendarNameError && <div className="form-error">{calendarNameError}</div>}
        <div className="token-create-row">
          <input
            type="text"
            className="form-input"
            value={calendarNameDraft}
            onChange={(e) => setCalendarNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameCalendar()}
            maxLength={200}
          />
          <button
            className="btn btn-primary"
            onClick={handleRenameCalendar}
            disabled={
              calendarNameSaving ||
              !calendarNameDraft.trim() ||
              calendarNameDraft.trim() === calendarName
            }
          >
            {calendarNameSaving
              ? "Saving..."
              : calendarNameSuccess
                ? "Saved!"
                : "Rename"}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Personal Access Tokens</h2>
        <p className="settings-description">
          Tokens are created via the CLI:{" "}
          <code>use-calendar auth login</code>. You can view and revoke
          existing tokens here.
        </p>

        {tokenError && <div className="form-error">{tokenError}</div>}

        {tokenLoading ? (
          <p className="muted">Loading tokens...</p>
        ) : tokens.length === 0 ? (
          <p className="muted">No tokens yet.</p>
        ) : (
          <ul className="token-list">
            {tokens.map((t) => (
              <li key={t.id} className="token-item">
                <div className="token-info">
                  <span className="token-name">{t.name}</span>
                  <span className="token-meta">
                    Created{" "}
                    {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt &&
                      ` \u00b7 Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                  </span>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteToken(t.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="settings-section">
        <h2>Calendar Feed</h2>
        <p className="settings-description">
          Subscribe to your calendar from any app that supports ICS feeds.
        </p>

        {feedError && <div className="form-error">{feedError}</div>}

        {feedLoading ? (
          <p className="muted">Loading...</p>
        ) : feed ? (
          <>
            <div className="feed-url-row">
              {showFeedUrl ? (
                <code className="feed-url">{feed.url}</code>
              ) : (
                <code className="feed-url">
                  {feed.hasToken ? "\u2022".repeat(16) : "URL hidden \u2014 regenerate to see it"}
                </code>
              )}
              {feed.hasToken && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowFeedUrl(!showFeedUrl)}
                >
                  {showFeedUrl ? "Hide" : "Show"}
                </button>
              )}
              {feed.hasToken && (
                <button className="btn btn-ghost btn-sm" onClick={copyFeedUrl}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
            <button className="btn btn-danger" onClick={handleRotateFeed}>
              Regenerate URL
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={handleRotateFeed}>
            Enable calendar feed
          </button>
        )}
      </section>
    </div>
  );
}
