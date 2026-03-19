import * as readline from "node:readline";
import qrcode from "qrcode-terminal";
import { ApiClient } from "../client.js";
import { getFeedUrl, saveFeedUrl } from "../config.js";
import { printJson, printError, printSuccess } from "../output.js";

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

function printQr(url: string): void {
  qrcode.generate(url, { small: true }, (code) => {
    console.log(code);
  });
}

export async function calendarUrl(args: string[]): Promise<void> {
  const isJson = args.includes("--json");
  const isRotate = args.includes("--rotate");

  try {
    const cached = getFeedUrl();

    if (cached && !isRotate) {
      if (isJson) {
        printJson({ url: cached });
      } else {
        console.log(`Calendar URL: ${cached}`);
        console.log("\nScan this QR code to subscribe on your phone:\n");
        printQr(cached);
        console.log("Or copy the URL above into your calendar app.");
      }
      return;
    }

    if (isRotate && cached) {
      const yes = await confirm("Rotate calendar URL? This will invalidate the existing feed.");
      if (!yes) {
        console.log("Cancelled.");
        return;
      }
    } else if (!cached) {
      const yes = await confirm("No cached calendar URL. Generate a new one? (This will invalidate any existing feed)");
      if (!yes) {
        console.log("Cancelled.");
        return;
      }
    }

    const client = new ApiClient();
    const info = await client.rotateFeed();
    saveFeedUrl(info.url);

    if (isJson) {
      printJson(info);
    } else {
      printSuccess("Calendar URL generated!");
      console.log(`Calendar URL: ${info.url}`);
      console.log("\nScan this QR code to subscribe on your phone:\n");
      printQr(info.url);
      console.log("Or copy the URL above into your calendar app.");
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
