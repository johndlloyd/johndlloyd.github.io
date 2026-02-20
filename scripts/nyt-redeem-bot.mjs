import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const TARGET_URL = "https://www.nytimes.com/subscription/redeem";
const REDEEM_CODE = process.env.NYT_REDEEM_CODE ?? "4a468a5059bc0b57";
const POST_FILL_WAIT_MS = Number.parseInt(process.env.NYT_WAIT_MS ?? "2000", 10);
const USER_DATA_DIR = process.env.NYT_PROFILE_DIR ?? ".nyt-profile";
const ONCE_MODE = process.argv.includes("--once");

function randomDelayMs() {
  return Math.floor(Math.random() * 24 * 60 * 60 * 1000);
}

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRedeemFlow() {
  await mkdir(USER_DATA_DIR, { recursive: true });
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, { headless: false });
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    const codeInput = page.getByRole("textbox").first();
    await codeInput.waitFor({ state: "visible", timeout: 30000 });
    await codeInput.fill(REDEEM_CODE);

    await page.waitForTimeout(POST_FILL_WAIT_MS);

    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click({ timeout: 30000 });

    console.log(`[${new Date().toISOString()}] Redeem flow submitted.`);
  } finally {
    await context.close();
  }
}

async function main() {
  if (ONCE_MODE) {
    console.log("Running NYT redeem flow once.");
    await runRedeemFlow();
    return;
  }

  console.log("Starting daily NYT redeem bot with random run time within each 24h window.");
  while (true) {
    const delay = randomDelayMs();
    const runAt = new Date(Date.now() + delay);
    console.log(`[${new Date().toISOString()}] Next run in ${formatMs(delay)} at ${runAt.toString()}`);
    await sleep(delay);

    try {
      await runRedeemFlow();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redeem flow failed:`, error);
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
