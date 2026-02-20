import { XMLParser } from "fast-xml-parser";
import { FEEDS } from "./cities";

type FeedItem = {
  title?: string;
  link?: string;
  description?: string;
  "content:encoded"?: string;
  summary?: string;
  pubDate?: string;
  "dc:date"?: string;
  "dc:subject"?: string | string[];
  category?: string | string[];
};

type NormalizedEvent = {
  id: string;
  title: string;
  link: string;
  description: string;
  date: string | null;
  categories: string[];
};

const BASE_URL = "https://www.missoulaevents.net";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  allowBooleanAttributes: true
});

function textOf(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(" ").trim();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("#text" in record) return textOf(record["#text"]);
    if ("__cdata" in record) return textOf(record["__cdata"]);
    if ("content" in record) return textOf(record["content"]);
  }
  return String(value);
}

function normalizeItems(items: FeedItem[] | FeedItem | undefined): NormalizedEvent[] {
  if (!items) return [];
  const list = Array.isArray(items) ? items : [items];

  return list.map((item) => {
    const title = textOf(item.title || "Untitled").trim();
    let link = textOf(item.link || "").trim();
    const description = textOf(item["content:encoded"] || item.description || item.summary || "").trim();
    const date = textOf(item["dc:date"] || item.pubDate || "").trim() || null;
    const rawCategories = [
      ...(Array.isArray(item.category) ? item.category : item.category ? [item.category] : []),
      ...(Array.isArray(item["dc:subject"]) ? item["dc:subject"] : item["dc:subject"] ? [item["dc:subject"]] : [])
    ];

    const categories = rawCategories
      .map((cat) => textOf(cat).trim())
      .filter(Boolean);

    if (!link && description) {
      const match = description.match(/https?:\/\/www\.missoulaevents\.net\/[^\s"'<]+/i);
      if (match) link = match[0];
    }

    if (link && !link.startsWith("http")) {
      try {
        link = new URL(link, BASE_URL).toString();
      } catch {
        // keep as-is if URL parsing fails
      }
    }

    const id = link || `${title}-${date || ""}`;

    return {
      id,
      title,
      link,
      description,
      date,
      categories
    };
  });
}

async function fetchFeed(url: string): Promise<NormalizedEvent[]> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "CityEventsRSS/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);

  const rssItems = parsed?.rss?.channel?.item;
  const atomItems = parsed?.feed?.entry;

  if (rssItems) return normalizeItems(rssItems);
  if (atomItems) return normalizeItems(atomItems);

  return [];
}

const TITLE_BLOCKLIST = [
  "aging",
  "senior",
  "missoula food bank",
  "gay men",
  "qweer",
  "narcotics anonymous"
];

const VENUE_BLOCKLIST = [
  "the poverello center",
  "summit independent living",
  "purusa yoga llc",
  "the clay studio of missoula",
  "lifelong learning center",
  "willow moon studio",
  "missoula brazilian jiu jitsu",
  "sunrise saloon"
];

function isBlockedEvent(event: NormalizedEvent) {
  const title = event.title.toLowerCase();
  const description = event.description.toLowerCase();

  if (TITLE_BLOCKLIST.some((term) => title.includes(term))) return true;

  const venueMatches = VENUE_BLOCKLIST.some((venue) => {
    return description.includes(`venue: ${venue}`) || description.includes(venue);
  });

  if (venueMatches) return true;

  return false;
}

function getFeedUrl(city: string, category: string) {
  const cityConfig = FEEDS[city as keyof typeof FEEDS];
  if (!cityConfig) return null;
  const categoryUrl = cityConfig.categories[category as keyof typeof cityConfig.categories];
  return categoryUrl || null;
}

const TIMEZONE_BY_CITY: Record<string, string> = {
  missoula: "America/Denver"
};

function toDateKey(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function filterByDay(events: NormalizedEvent[], targetOffsetDays: number, timeZone: string) {
  const now = new Date();
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + targetOffsetDays);
  const targetKey = toDateKey(target, timeZone);

  return events.filter((event) => {
    if (event.date) {
      const eventDate = new Date(event.date);
      if (!Number.isNaN(eventDate.getTime())) {
        return toDateKey(eventDate, timeZone) === targetKey;
      }
    }

    if (event.link) {
      const match = event.link.match(/\/(\d{2})\/(\d{2})\/(\d{4})\//);
      if (match) {
        const [_, mm, dd, yyyy] = match;
        const linkKey = `${yyyy}-${mm}-${dd}`;
        return linkKey === targetKey;
      }
    }

    return false;
  });
}

export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "missoula").toLowerCase();
  const category = (url.searchParams.get("category") || "combined").toLowerCase();
  const isToday = category === "today";
  const isTomorrow = category === "tomorrow";
  const baseCategory = isToday || isTomorrow ? "combined" : category;
  const feedUrl = getFeedUrl(city, baseCategory);

  if (!feedUrl) {
    return new Response(
      JSON.stringify({
        error: "Unknown city or category",
        city,
        category
      }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }

  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const events = (await fetchFeed(feedUrl)).filter((event) => !isBlockedEvent(event));
    const timeZone = TIMEZONE_BY_CITY[city] || "UTC";
    const filteredEvents =
      isToday ? filterByDay(events, 0, timeZone) : isTomorrow ? filterByDay(events, 1, timeZone) : events;
    const payload = {
      city,
      category,
      source: feedUrl,
      updatedAt: new Date().toISOString(),
      events: filteredEvents
    };

    const response = new Response(JSON.stringify(payload), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=900"
      }
    });

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to load feed",
        detail: error instanceof Error ? error.message : "unknown"
      }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
};
