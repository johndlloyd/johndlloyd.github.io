import { chromium } from "playwright";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const TARGET_URL =
  "https://www.patagonia.com/shop/web-specials/mens/l+m?index=0&sortval=launch_date&sortrule=desc";
const FALLBACK_URL = "https://www.patagonia.com/shop/mens-web-specials-redirect";
const OUTPUT_ROOT = process.env.PATAGONIA_TRACKER_DIR ?? "data/patagonia-web-specials";
const SNAPSHOTS_DIR = path.join(OUTPUT_ROOT, "snapshots");
const REPORTS_DIR = path.join(OUTPUT_ROOT, "reports");
const HEADLESS = !process.argv.includes("--headed");
const DAILY_MODE = process.argv.includes("--daily");
const DAILY_INTERVAL_HOURS = Number.parseInt(process.env.PATAGONIA_DAILY_INTERVAL_HOURS ?? "24", 10);
const MAX_SCROLL_STEPS = Number.parseInt(process.env.PATAGONIA_MAX_SCROLL_STEPS ?? "80", 10);
const SCROLL_PAUSE_MS = Number.parseInt(process.env.PATAGONIA_SCROLL_PAUSE_MS ?? "1200", 10);
const MANUAL_CHROMIUM_PATH = process.env.PATAGONIA_CHROMIUM_EXECUTABLE ?? null;
const DEBUG_DUMP_ON_EMPTY = process.env.PATAGONIA_DEBUG_DUMP_ON_EMPTY !== "0";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatUsdLike(value) {
  return value.replace(/\s+/g, "").replace("$", "$");
}

async function ensureDirs() {
  await mkdir(SNAPSHOTS_DIR, { recursive: true });
  await mkdir(REPORTS_DIR, { recursive: true });
}

async function canAccess(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromiumExecutable() {
  if (MANUAL_CHROMIUM_PATH && (await canAccess(MANUAL_CHROMIUM_PATH))) {
    return MANUAL_CHROMIUM_PATH;
  }

  const cacheRoot = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  let entries = [];
  try {
    entries = await readdir(cacheRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  const chromiumDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  for (const dirName of chromiumDirs) {
    const executable = path.join(
      cacheRoot,
      dirName,
      "chrome-mac",
      "Chromium.app",
      "Contents",
      "MacOS",
      "Chromium",
    );
    if (await canAccess(executable)) return executable;
  }

  return null;
}

async function scrollWholePage(page) {
  let unchangedHeights = 0;
  let previousHeight = 0;

  for (let i = 0; i < MAX_SCROLL_STEPS && unchangedHeights < 4; i += 1) {
    const clickedLoadMore = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("button, a"));
      const loadMore = candidates.find((node) =>
        /load more|show more|view more/i.test((node.textContent ?? "").trim()),
      );
      if (!loadMore) return false;
      (loadMore).click();
      return true;
    });

    await page.evaluate(() => {
      window.scrollBy(0, Math.max(window.innerHeight * 0.9, 600));
    });

    await page.waitForTimeout(SCROLL_PAUSE_MS);

    const currentHeight = await page.evaluate(
      () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    );

    if (clickedLoadMore || currentHeight > previousHeight) {
      unchangedHeights = 0;
      previousHeight = currentHeight;
      continue;
    }

    unchangedHeights += 1;
  }

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(SCROLL_PAUSE_MS);
}

function normalizePrice(rawPrice) {
  if (rawPrice == null) return null;
  if (typeof rawPrice === "number") return `$${rawPrice.toFixed(2)}`;
  if (typeof rawPrice !== "string") return null;
  const match = rawPrice.match(/\$\s?\d[\d,]*(?:\.\d{2})?/);
  return match ? match[0].replace(/\s+/g, "") : null;
}

function normalizeUrl(rawUrl, base) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  try {
    return new URL(rawUrl, base).toString();
  } catch {
    return null;
  }
}

function scoreCandidate(item) {
  return (item.price ? 10 : 0) + (item.name?.length ?? 0);
}

function dedupeItems(items) {
  const deduped = new Map();
  for (const item of items) {
    if (!item?.url || !item.url.includes("/product/")) continue;
    const existing = deduped.get(item.url);
    if (!existing || scoreCandidate(item) > scoreCandidate(existing)) {
      deduped.set(item.url, item);
    }
  }
  return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function slugToTitle(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractItemsFromHtml(html, baseUrl) {
  const results = [];
  const urlRegex = /https?:\/\/www\.patagonia\.com\/product\/[a-z0-9\-_/%.]+(?:\.html)?|\/product\/[a-z0-9\-_/%.]+(?:\.html)?/gi;
  const priceRegex = /\$\s?\d[\d,]*(?:\.\d{2})?/g;
  const matches = [...html.matchAll(urlRegex)];

  for (const match of matches) {
    const rawUrl = match[0];
    const url = normalizeUrl(rawUrl, baseUrl);
    if (!url || !url.includes("/product/")) continue;

    const index = match.index ?? 0;
    const windowStart = Math.max(0, index - 1200);
    const windowEnd = Math.min(html.length, index + 1200);
    const snippet = html.slice(windowStart, windowEnd);

    const priceMatch = snippet.match(priceRegex)?.[0] ?? null;
    const nameMatch =
      snippet.match(/"name"\s*:\s*"([^"]+)"/i)?.[1] ??
      snippet.match(/"productName"\s*:\s*"([^"]+)"/i)?.[1] ??
      snippet.match(/aria-label="([^"]+)"/i)?.[1] ??
      null;

    let fallbackName = "Unknown item";
    try {
      const pathname = new URL(url).pathname;
      const slug = pathname.split("/").filter(Boolean).slice(-1)[0]?.replace(/\.html$/i, "") ?? "";
      if (slug) fallbackName = slugToTitle(slug);
    } catch {
      // Ignore URL parse errors.
    }

    results.push({
      name: (nameMatch?.trim() || fallbackName).replace(/\s+/g, " "),
      price: normalizePrice(priceMatch),
      allPrices: priceMatch ? [normalizePrice(priceMatch)] : [],
      url,
    });
  }

  return dedupeItems(results);
}

async function scrapeItems(page) {
  const domItems = await page.evaluate(() => {
    const priceRegex = /\$\s?\d[\d,]*(?:\.\d{2})?/g;
    const strictPriceRegex = /^\$\s?\d[\d,]*(?:\.\d{2})?$/;
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    const rawItems = [];

    for (const anchor of anchors) {
      const href = anchor.getAttribute("href");
      if (!href) continue;

      let url;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        continue;
      }

      if (!url.pathname.includes("/product/")) continue;

      const container = anchor.closest("article, li, section, div");
      const containerText = container?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const headingText =
        container?.querySelector("h1, h2, h3, h4, [class*='name'], [data-testid*='name']")?.textContent ?? "";
      const anchorText = anchor.textContent ?? "";
      const ariaLabel = anchor.getAttribute("aria-label") ?? "";

      const name = [ariaLabel, headingText, anchorText]
        .map((v) => v.replace(/\s+/g, " ").trim())
        .find((v) => v.length >= 3 && !strictPriceRegex.test(v)) ?? "Unknown item";

      const priceMatches = Array.from(new Set((containerText.match(priceRegex) ?? []).map((v) => v.replace(/\s+/g, ""))));

      rawItems.push({
        name,
        price: priceMatches[0] ?? null,
        allPrices: priceMatches,
        url: url.toString(),
      });
    }

    return rawItems;
  });

  const scriptItems = await page.evaluate(() => {
    const out = [];
    const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json'], script#__NEXT_DATA__, script"));
    for (const script of scripts) {
      const text = script.textContent?.trim();
      if (!text || text.length < 30) continue;
      if (!/product|price|web specials|Product/i.test(text)) continue;
      out.push(text);
    }
    return out;
  });

  const candidateItems = [...domItems];
  for (const raw of scriptItems) {
    try {
      const parsed = JSON.parse(raw);
      candidateItems.push(...extractProductLikeObjects(parsed, page.url()));
    } catch {
      continue;
    }
  }

  return dedupeItems(
    candidateItems.map((item) => ({
      name: item.name ?? "Unknown item",
      price: normalizePrice(item.price) ?? null,
      allPrices: item.allPrices ?? (item.price ? [normalizePrice(item.price)] : []),
      url: normalizeUrl(item.url, page.url()) ?? "",
    })),
  );
}

function extractProductLikeObjects(root, baseUrl) {
  const results = [];
  const queue = [root];
  const seen = new Set();

  while (queue.length) {
    const node = queue.pop();
    if (node == null) continue;

    if (typeof node === "object") {
      if (seen.has(node)) continue;
      seen.add(node);
    }

    if (Array.isArray(node)) {
      for (const value of node) queue.push(value);
      continue;
    }

    if (typeof node !== "object") continue;

    const values = Object.values(node);
    for (const value of values) {
      if (value && typeof value === "object") queue.push(value);
    }

    const urlKeys = ["url", "productUrl", "productPageUrl", "pdpUrl", "link", "href"];
    const nameKeys = ["name", "productName", "title", "displayName"];
    const priceKeys = ["salePrice", "price", "finalPrice", "currentPrice", "formattedPrice"];

    const rawUrl = urlKeys.map((key) => node[key]).find((v) => typeof v === "string");
    const url = normalizeUrl(rawUrl, baseUrl);
    if (!url || !url.includes("/product/")) continue;

    const rawName = nameKeys.map((key) => node[key]).find((v) => typeof v === "string" && v.trim().length > 1);
    const rawPrice = priceKeys.map((key) => node[key]).find((v) => typeof v === "string" || typeof v === "number");

    results.push({
      name: rawName?.trim() ?? "Unknown item",
      price: normalizePrice(rawPrice),
      url,
      allPrices: rawPrice ? [normalizePrice(rawPrice)] : [],
    });
  }

  return results;
}

async function getPreviousSnapshot(runDate) {
  const files = await readdir(SNAPSHOTS_DIR, { withFileTypes: true });
  const candidates = files
    .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name))
    .map((entry) => entry.name.replace(".json", ""))
    .filter((date) => date < runDate)
    .sort((a, b) => b.localeCompare(a));

  if (!candidates.length) return null;
  const filePath = path.join(SNAPSHOTS_DIR, `${candidates[0]}.json`);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function findNewItems(currentItems, previousItems) {
  const previousUrls = new Set(previousItems.map((item) => item.url));
  return currentItems.filter((item) => !previousUrls.has(item.url));
}

function buildMarkdownReport({ runDate, snapshotPath, items, newItems, previousDate }) {
  const lines = [];
  lines.push(`# Patagonia Web Specials Snapshot - ${runDate}`);
  lines.push("");
  lines.push(`- Source: ${TARGET_URL}`);
  lines.push(`- Snapshot file: ${snapshotPath}`);
  lines.push(`- Total items scraped: ${items.length}`);
  lines.push(`- Previous snapshot date: ${previousDate ?? "none"}`);
  lines.push(`- New items: ${newItems.length}`);
  lines.push("");
  lines.push("## New Items");
  lines.push("");

  if (!newItems.length) {
    lines.push("- None");
  } else {
    for (const item of newItems) {
      const price = item.price ? formatUsdLike(item.price) : "Price not found";
      lines.push(`- ${item.name} - ${price} - ${item.url}`);
    }
  }

  lines.push("");
  lines.push("## All Items");
  lines.push("");
  for (const item of items) {
    const price = item.price ? formatUsdLike(item.price) : "Price not found";
    lines.push(`- ${item.name} - ${price} - ${item.url}`);
  }

  return lines.join("\n");
}

async function runOnce() {
  const runDate = todayDate();
  await ensureDirs();
  const browserHomeDir = path.join(OUTPUT_ROOT, ".browser-home");
  await mkdir(browserHomeDir, { recursive: true });

  const networkItems = [];
  const fallbackExecutablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({
    headless: HEADLESS,
    executablePath: fallbackExecutablePath ?? undefined,
    env: {
      ...process.env,
      HOME: browserHomeDir,
    },
    args: ["--disable-crashpad", "--disable-crash-reporter"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "en-US",
    viewport: { width: 1440, height: 1200 },
  });
  const page = await context.newPage();
  page.on("response", async (response) => {
    try {
      const contentType = response.headers()["content-type"] ?? "";
      if (!contentType.includes("application/json")) return;
      const body = await response.json();
      const extracted = extractProductLikeObjects(body, response.url());
      if (extracted.length) networkItems.push(...extracted);
    } catch {
      // Ignore non-JSON bodies and parse failures.
    }
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(2500);
    await page.waitForLoadState("networkidle").catch(() => {});
    await scrollWholePage(page);
    await page.waitForTimeout(1000);

    let items = await scrapeItems(page);
    if (!items.length) {
      const html = await page.content();
      items = extractItemsFromHtml(html, page.url());
      console.log(`HTML fallback items: ${items.length}`);
    }
    console.log(`Initial scrape items: ${items.length}`);
    console.log(`Network-derived candidates: ${networkItems.length}`);
    if (!items.length) {
      console.log(`No items on primary URL, retrying on fallback URL: ${FALLBACK_URL}`);
      await page.goto(FALLBACK_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2500);
      await page.waitForLoadState("networkidle").catch(() => {});
      await scrollWholePage(page);
      await page.waitForTimeout(1000);
      items = await scrapeItems(page);
      if (!items.length) {
        const html = await page.content();
        items = extractItemsFromHtml(html, page.url());
        console.log(`Fallback HTML items: ${items.length}`);
      }
      console.log(`Fallback scrape items: ${items.length}`);
    }

    items = dedupeItems([
      ...items,
      ...networkItems.map((item) => ({
        name: item.name ?? "Unknown item",
        price: normalizePrice(item.price),
        allPrices: item.price ? [normalizePrice(item.price)] : [],
        url: normalizeUrl(item.url, TARGET_URL),
      })),
    ]);

    if (!items.length && DEBUG_DUMP_ON_EMPTY) {
      const html = await page.content();
      const debugPath = path.join(OUTPUT_ROOT, `debug-empty-${runDate}.html`);
      await writeFile(debugPath, html, "utf8");
      console.log(`No items found. Wrote debug HTML to: ${debugPath}`);
    }
    const snapshot = {
      runDate,
      generatedAt: new Date().toISOString(),
      sourceUrl: TARGET_URL,
      itemCount: items.length,
      items,
    };

    const previousSnapshot = await getPreviousSnapshot(runDate);
    const previousItems = previousSnapshot?.items ?? [];
    const previousDate = previousSnapshot?.runDate ?? null;
    const newItems = findNewItems(items, previousItems);

    const snapshotPath = path.join(SNAPSHOTS_DIR, `${runDate}.json`);
    const reportPath = path.join(REPORTS_DIR, `${runDate}.md`);

    await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

    const report = buildMarkdownReport({
      runDate,
      snapshotPath,
      items,
      newItems,
      previousDate,
    });
    await writeFile(reportPath, `${report}\n`, "utf8");

    const latestSummary = {
      runDate,
      snapshotPath,
      reportPath,
      itemCount: items.length,
      newItemCount: newItems.length,
      newItems: newItems.map((item) => ({ name: item.name, price: item.price, url: item.url })),
    };
    await writeFile(path.join(OUTPUT_ROOT, "latest.json"), `${JSON.stringify(latestSummary, null, 2)}\n`, "utf8");

    console.log(`Saved snapshot: ${snapshotPath}`);
    console.log(`Saved report: ${reportPath}`);
    console.log(`Scraped ${items.length} items. New since previous day: ${newItems.length}`);
    if (newItems.length) {
      console.log("New items:");
      for (const item of newItems) {
        console.log(`- ${item.name} | ${item.price ?? "Price not found"} | ${item.url}`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  if (!DAILY_MODE) {
    await runOnce();
    return;
  }

  console.log(`Daily mode enabled. Running every ${DAILY_INTERVAL_HOURS} hour(s).`);
  while (true) {
    try {
      await runOnce();
    } catch (error) {
      console.error("Tracker run failed:", error);
    }
    await sleep(DAILY_INTERVAL_HOURS * 60 * 60 * 1000);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
