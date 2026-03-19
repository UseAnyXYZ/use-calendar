import { exec } from "node:child_process";
import { loadConfig, saveConfig, getConfigPath } from "../config.js";
import { ApiClient } from "../client.js";
import { printJson, printError, printSuccess } from "../output.js";

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? "open" :
    platform === "win32" ? "start" :
    "xdg-open";
  exec(`${cmd} ${JSON.stringify(url)}`);
}

async function loginWithBrowser(): Promise<void> {
  const config = loadConfig();
  const baseUrl = config.apiBaseUrl ?? "";

  // Start CLI auth session
  let code: string;
  try {
    const res = await fetch(`${baseUrl}/api/auth/cli/start`, { method: "POST" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as { code: string; expiresAt: string };
    code = data.code;
  } catch (err) {
    printError(`Failed to start auth session: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const authUrl = `${baseUrl}/cli-auth?code=${code}`;
  console.log("Opening browser to authenticate...");
  console.log(`If the browser doesn't open, visit: ${authUrl}`);
  openBrowser(authUrl);

  // Poll for completion
  console.log("Waiting for authorization...");
  const maxAttempts = 300; // 10 minutes at 2s intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    try {
      const res = await fetch(`${baseUrl}/api/auth/cli/poll?code=${encodeURIComponent(code)}`);
      if (!res.ok) continue;

      const data = (await res.json()) as { status: string; token?: string; tokenName?: string };

      if (data.status === "completed" && data.token) {
        config.apiToken = data.token;
        saveConfig(config);
        printSuccess("Logged in successfully!");
        printSuccess(`Token saved to ${getConfigPath()}`);
        return;
      }

      if (data.status === "expired") {
        printError("Authorization session expired. Please try again.");
        process.exit(1);
      }

      // status === "pending", continue polling
    } catch {
      // Network error, continue polling
    }
  }

  printError("Authorization timed out. Please try again.");
  process.exit(1);
}

export async function login(args: string[]): Promise<void> {
  const tokenIndex = args.indexOf("--token");
  if (tokenIndex !== -1 && tokenIndex + 1 < args.length) {
    // Manual token flow
    const token = args[tokenIndex + 1];
    const config = loadConfig();
    config.apiToken = token;
    saveConfig(config);
    printSuccess(`Token saved to ${getConfigPath()}`);
    return;
  }

  // Browser-based auth flow
  await loginWithBrowser();
}

export async function whoami(args: string[]): Promise<void> {
  const isJson = args.includes("--json");

  try {
    const client = new ApiClient();
    const user = await client.me();

    if (isJson) {
      printJson(user);
    } else {
      console.log(`Email: ${user.email}`);
      console.log(`ID:    ${user.id}`);
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
