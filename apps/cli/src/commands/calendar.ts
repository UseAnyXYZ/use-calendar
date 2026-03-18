import { ApiClient } from "../client.js";
import { printJson, printError } from "../output.js";

export async function feedUrl(args: string[]): Promise<void> {
  const isJson = args.includes("--json");

  try {
    const client = new ApiClient();
    const info = await client.getFeedInfo();

    if (isJson) {
      printJson(info);
    } else {
      console.log(`Feed URL: ${info.url}`);
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
