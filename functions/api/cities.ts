const FEEDS = {
  missoula: {
    label: "Missoula",
    categories: {
      combined: "https://www.missoulaevents.net/rss/blended/",
      music: "https://www.missoulaevents.net/rss/music/",
      "the-arts": "https://www.missoulaevents.net/rss/the-arts/",
      "food-bev": "https://www.missoulaevents.net/rss/food-bev/",
      "sports-rec": "https://www.missoulaevents.net/rss/sports-rec/",
      education: "https://www.missoulaevents.net/rss/education/",
      "special-events": "https://www.missoulaevents.net/rss/special-events/"
    }
  }
} as const;

function toCityResponse() {
  return Object.entries(FEEDS).map(([key, value]) => ({
    id: key,
    label: value.label,
    categories: ["today", "tomorrow", "combined"]
  }));
}

export const onRequest: PagesFunction = async () => {
  return new Response(
    JSON.stringify({
      cities: toCityResponse(),
      defaultCity: "missoula",
      defaultCategory: "combined"
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
};

export type FeedConfig = typeof FEEDS;
export type CityId = keyof FeedConfig;
export type CategoryId = keyof FeedConfig["missoula"]["categories"];
export { FEEDS };
