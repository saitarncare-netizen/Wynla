// Open-Meteo daily forecast for a coordinate.
// Free, no API key. Cached 30 min via Next.js fetch revalidation.

export type WeatherDay = {
  date: string;             // ISO YYYY-MM-DD
  tempMaxF: number | null;
  tempMinF: number | null;
  snowfallInches: number;
  rainInches: number;
  windSpeedMph: number;
  weatherCode: number;
  conditions: string;       // human-readable summary
  emoji: string;            // 1-char visual stand-in
};

// WMO weather codes -> readable conditions + emoji
const CODE_MAP: Record<number, { label: string; emoji: string }> = {
  0: { label: "Clear", emoji: "☀️" },
  1: { label: "Mostly clear", emoji: "🌤️" },
  2: { label: "Partly cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Foggy", emoji: "🌫️" },
  48: { label: "Foggy", emoji: "🌫️" },
  51: { label: "Light drizzle", emoji: "🌦️" },
  53: { label: "Drizzle", emoji: "🌦️" },
  55: { label: "Heavy drizzle", emoji: "🌧️" },
  61: { label: "Light rain", emoji: "🌧️" },
  63: { label: "Rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  66: { label: "Freezing rain", emoji: "🌨️" },
  67: { label: "Heavy freezing rain", emoji: "🌨️" },
  71: { label: "Light snow", emoji: "🌨️" },
  73: { label: "Snow", emoji: "❄️" },
  75: { label: "Heavy snow", emoji: "❄️" },
  77: { label: "Snow grains", emoji: "❄️" },
  80: { label: "Rain showers", emoji: "🌦️" },
  81: { label: "Rain showers", emoji: "🌧️" },
  82: { label: "Heavy rain", emoji: "🌧️" },
  85: { label: "Snow showers", emoji: "🌨️" },
  86: { label: "Heavy snow", emoji: "❄️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  96: { label: "Thunderstorm w/ hail", emoji: "⛈️" },
  99: { label: "Heavy thunderstorm", emoji: "⛈️" },
};

function describe(code: number) {
  return CODE_MAP[code] ?? { label: "Unknown", emoji: "🌡️" };
}

export async function getForecast(
  lat: number,
  lon: number,
  tz = "America/New_York",
): Promise<WeatherDay[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,snowfall_sum,rain_sum,windspeed_10m_max,weathercode",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("windspeed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", tz);
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();
  const d = data.daily;

  return d.time.map((date: string, i: number) => {
    const code = d.weathercode[i] ?? 0;
    const { label, emoji } = describe(code);
    return {
      date,
      tempMaxF: d.temperature_2m_max[i] != null ? Math.round(d.temperature_2m_max[i]) : null,
      tempMinF: d.temperature_2m_min[i] != null ? Math.round(d.temperature_2m_min[i]) : null,
      snowfallInches: Number(d.snowfall_sum[i] ?? 0),
      rainInches: Number(d.rain_sum[i] ?? 0),
      windSpeedMph: Math.round(d.windspeed_10m_max[i] ?? 0),
      weatherCode: code,
      conditions: label,
      emoji,
    };
  });
}

// Friendly day label: "Today", "Tomorrow", or "Mon Mar 4"
export function dayLabel(isoDate: string, todayIso: string): string {
  if (isoDate === todayIso) return "Today";
  const today = new Date(todayIso);
  const day = new Date(isoDate);
  const diffDays = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diffDays === 1) return "Tomorrow";
  return day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
