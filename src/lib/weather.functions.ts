import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit } from "./server-utils.server";
import type { WeatherIntel } from "./weather-types";

const InputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  crop: z.string().trim().min(1).max(80).default("Tomato"),
});

export const getWeatherIntel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<WeatherIntel> => {
    await enforceRateLimit(context.userId, "weather.intel", 30);
    const { assessRisk, fetchWeather } = await import("./weather.server");
    const weather = await fetchWeather(data.lat, data.lon);
    return assessRisk(weather, data.crop);
  });
