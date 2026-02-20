import { onRequest as __api_cities_ts_onRequest } from "/Users/jlloyd/Codex/functions/api/cities.ts"
import { onRequest as __api_events_ts_onRequest } from "/Users/jlloyd/Codex/functions/api/events.ts"

export const routes = [
    {
      routePath: "/api/cities",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_cities_ts_onRequest],
    },
  {
      routePath: "/api/events",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_events_ts_onRequest],
    },
  ]