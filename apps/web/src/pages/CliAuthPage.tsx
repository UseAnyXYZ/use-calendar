import { useEffect, useState, type FormEvent } from "react";
import { CalendarIcon } from "../CalendarIcon";
import { api, ApiError, type User } from "../api";

interface Props {
  code: string;
}

type Step = "loading" | "auth" | "authorize" | "success" | "error";

export function CliAuthPage({ code }: Props) {
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function init() {
      // Validate the code
      try {
        const result = await api.cliAuthCheck(code);
        if (result.status !== "pending") {
          setError("This authorization link has expired or was already used.");
          setStep("error");
          return;
        }
      } catch {
        setError("Invalid authorization link.");
        setStep("error");
        return;
      }

      // Check if user is already logged in
      try {
        const u = await api.me();
        setUser(u);
        setStep("authorize");
      } catch {
        setStep("auth");
      }
    }
    init();
  }, [code]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const u = await api.login(email, password);
      setUser(u);
      setStep("authorize");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (password !== confirm) {
      setFormError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const u = await api.register(email, password);
      setUser(u);
      setStep("authorize");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthorize = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.cliAuthApprove(code);
      setStep("success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Authorization failed");
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title"><CalendarIcon /> Use Calendar</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title"><CalendarIcon /> Use Calendar</h1>
          <div className="form-error">{error}</div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title"><CalendarIcon /> Use Calendar</h1>
          <h2>CLI Authorized</h2>
          <p>You can close this tab and return to your terminal.</p>
        </div>
      </div>
    );
  }

  if (step === "authorize") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title"><CalendarIcon /> Use Calendar</h1>
          <h2>Authorize CLI</h2>
          <p>
            Signed in as <strong>{user?.email}</strong>. Grant access to the CLI?
            This will create a personal access token.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleAuthorize}
            disabled={submitting}
            style={{ marginTop: "1rem", width: "100%" }}
          >
            {submitting ? "Authorizing..." : "Authorize"}
          </button>
        </div>
      </div>
    );
  }

  // step === "auth"
  if (authMode === "login") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title"><CalendarIcon /> Use Calendar</h1>
          <h2>Sign in to authorize CLI</h2>
          <form onSubmit={handleLogin} className="auth-form">
            {formError && <div className="form-error">{formError}</div>}
            <label className="form-label">
              Email
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </label>
            <label className="form-label">
              Password
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            Don't have an account?{" "}
            <button className="link-btn" onClick={() => { setAuthMode("register"); setFormError(""); }}>
              Create one
            </button>
          </p>
        </div>
      </div>
    );
  }

  // authMode === "register"
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title"><CalendarIcon /> Use Calendar</h1>
        <h2>Create account to authorize CLI</h2>
        <form onSubmit={handleRegister} className="auth-form">
          {formError && <div className="form-error">{formError}</div>}
          <label className="form-label">
            Email
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </label>
          <label className="form-label">
            Password
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="form-label">
            Confirm password
            <input
              type="password"
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{" "}
          <button className="link-btn" onClick={() => { setAuthMode("login"); setFormError(""); }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
