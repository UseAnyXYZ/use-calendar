import { loadConfig, saveConfig, getConfigPath } from "../config.js";
import { ApiClient } from "../client.js";
import { printJson, printError, printSuccess } from "../output.js";

export async function login(args: string[]): Promise<void> {
  const tokenIndex = args.indexOf("--token");
  if (tokenIndex === -1 || tokenIndex + 1 >= args.length) {
    printError("Usage: use-calendar auth login --token <PAT>");
    process.exit(1);
  }

  const token = args[tokenIndex + 1];

  const config = loadConfig();
  config.apiToken = token;
  saveConfig(config);

  printSuccess(`Token saved to ${getConfigPath()}`);
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
