import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface Config {
  apiToken?: string;
  apiBaseUrl?: string;
  feedUrl?: string;
}

export function getConfigDir(): string {
  const platform = os.platform();

  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "use-calendar");
  }

  if (platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "use-calendar");
  }

  // Linux and others: use XDG_CONFIG_HOME or ~/.config
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(xdgConfig, "use-calendar");
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

const DEFAULT_BASE_URL = "https://calendar.useany.sh";

export function loadConfig(): Config {
  const configPath = getConfigPath();

  let config: Config;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    config = JSON.parse(content) as Config;
  } catch {
    config = {};
  }

  config.apiBaseUrl ??= process.env.API_BASE_URL ?? DEFAULT_BASE_URL;

  return config;
}

export function saveConfig(config: Config): void {
  const configDir = getConfigDir();

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function getFeedUrl(): string | undefined {
  return loadConfig().feedUrl;
}

export function saveFeedUrl(url: string): void {
  const config = loadConfig();
  config.feedUrl = url;
  saveConfig(config);
}
