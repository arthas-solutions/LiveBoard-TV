import { getStationConfig } from "@/lib/config/liveboard";
import type {
  ForecastPoint,
  SourceResponse,
  StationConfig,
  WeatherData,
  WeeklyForecastDay,
} from "@/lib/types/liveboard";
import { fetchJson, buildResponse } from "@/lib/providers/http";

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
  };
};

const WEATHER_CODES: Record<number, string> = {
  0: "Ensoleille",
  1: "Peu nuageux",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine legere",
  53: "Bruine",
  55: "Bruine forte",
  56: "Bruine verglaçante",
  57: "Bruine verglaçante forte",
  61: "Pluie legere",
  63: "Pluie",
  65: "Pluie forte",
  66: "Pluie verglaçante",
  67: "Pluie verglaçante forte",
  71: "Neige legere",
  73: "Neige",
  75: "Neige forte",
  77: "Grains de neige",
  80: "Averses legeres",
  81: "Averses",
  82: "Averses fortes",
  85: "Averses de neige",
  86: "Averses de neige fortes",
  95: "Orage",
  96: "Orage et grele",
  99: "Orage violent",
};

function weatherCodeToLabel(code?: number): string {
  if (typeof code !== "number") {
    return "Inconnu";
  }
  return WEATHER_CODES[code] ?? "Inconnu";
}

function buildForecast(hourly: OpenMeteoResponse["hourly"]): ForecastPoint[] {
  if (!hourly?.time?.length || !hourly.temperature_2m?.length || !hourly.weather_code?.length) {
    return [];
  }

  const times = hourly.time;
  const temperatures = hourly.temperature_2m;
  const weatherCodes = hourly.weather_code;

  const offsets: Array<1 | 2 | 3> = [1, 2, 3];
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  const startIndex = times.findIndex((entry) => new Date(entry) >= nextHour);
  const baseIndex = startIndex >= 0 ? startIndex : 0;

  return offsets
    .map((offset) => {
      const index = baseIndex + (offset - 1);
      if (times.length <= index || temperatures.length <= index || weatherCodes.length <= index) {
        return null;
      }

      const weatherCode = weatherCodes[index] ?? -1;
      return {
        offsetHours: offset,
        time: times[index] ?? "",
        temperature: Math.round(temperatures[index] ?? 0),
        weatherCode,
        condition: weatherCodeToLabel(weatherCode),
      } satisfies ForecastPoint;
    })
    .filter((point): point is ForecastPoint => point !== null);
}

function buildWeeklyForecast(daily: OpenMeteoResponse["daily"]): WeeklyForecastDay[] {
  if (
    !daily?.time?.length ||
    !daily.weather_code?.length ||
    !daily.temperature_2m_min?.length ||
    !daily.temperature_2m_max?.length
  ) {
    return [];
  }

  const days = daily.time;
  const codes = daily.weather_code;
  const mins = daily.temperature_2m_min;
  const maxs = daily.temperature_2m_max;
  const size = Math.min(days.length, codes.length, mins.length, maxs.length, 7);

  return Array.from({ length: size }).map((_, index) => {
    const weatherCode = codes[index] ?? -1;
    return {
      date: days[index] ?? "",
      weatherCode,
      condition: weatherCodeToLabel(weatherCode),
      temperatureMin: Math.round(mins[index] ?? 0),
      temperatureMax: Math.round(maxs[index] ?? 0),
    } satisfies WeeklyForecastDay;
  });
}

export async function getWeather(stationKey?: string): Promise<SourceResponse<WeatherData>> {
  const station: StationConfig = getStationConfig(stationKey);
  const params = new URLSearchParams({
    latitude: String(station.coordinates.latitude),
    longitude: String(station.coordinates.longitude),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    forecast_hours: "12",
    daily: "weather_code,temperature_2m_min,temperature_2m_max",
    forecast_days: "7",
    timezone: station.timezone,
  });

  const endpoint = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const payload = await fetchJson<OpenMeteoResponse>(endpoint, {
      next: { revalidate: 60 },
    });

    const weatherCode = payload.current?.weather_code ?? -1;
    const data: WeatherData = {
      city: station.city,
      station: station.station,
      temperature: Math.round(payload.current?.temperature_2m ?? 0),
      apparentTemperature:
        typeof payload.current?.apparent_temperature === "number"
          ? Math.round(payload.current.apparent_temperature)
          : undefined,
      windSpeed: Math.round(payload.current?.wind_speed_10m ?? 0),
      weatherCode,
      condition: weatherCodeToLabel(weatherCode),
      forecast: buildForecast(payload.hourly),
      weeklyForecast: buildWeeklyForecast(payload.daily),
    };

    return buildResponse({
      source: "Open-Meteo",
      data,
      health: "ok",
      ok: true,
    });
  } catch (error) {
    return buildResponse<WeatherData>({
      source: "Open-Meteo",
      data: null,
      health: "down",
      ok: false,
      message: error instanceof Error ? error.message : "Weather provider unavailable",
    });
  }
}
