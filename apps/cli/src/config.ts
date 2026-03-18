import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface Config {
  apiToken?: string;
  apiBaseUrl?: string;
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

export function loadConfig(): Config {
  const configPath = getConfigPath();

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  const configDir = getConfigDir();

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
