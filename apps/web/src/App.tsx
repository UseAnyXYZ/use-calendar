import { useEffect, useState } from "react";
import { CalendarIcon } from "./CalendarIcon";
import { api, type User } from "./api";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EventsPage } from "./pages/EventsPage";
import { SettingsPage } from "./pages/SettingsPage";

type AuthPage = "login" | "register";
type AppPage = "events" | "settings";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [appPage, setAppPage] = useState<AppPage>("events");

  useEffect(() => {
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setAppPage("events");
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setAuthPage("login");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return authPage === "login" ? (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthPage("register")}
      />
    ) : (
      <RegisterPage
        onRegister={handleLogin}
        onSwitchToLogin={() => setAuthPage("login")}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title"><CalendarIcon /> Use Calendar</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${appPage === "events" ? "active" : ""}`}
            onClick={() => setAppPage("events")}
          >
            Events
          </button>
          <button
            className={`nav-btn ${appPage === "settings" ? "active" : ""}`}
            onClick={() => setAppPage("settings")}
          >
            Settings
          </button>
        </nav>
      </header>
      <main className="app-main">
        {appPage === "events" && <EventsPage />}
        {appPage === "settings" && (
          <SettingsPage user={user} onLogout={handleLogout} />
        )}
      </main>
    </div>
  );
}
