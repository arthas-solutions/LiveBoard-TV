export type Locale = "fr" | "en";

export type LayoutPreset = "full" | "lowerthird";

export type HealthState = "ok" | "degraded" | "down" | "config";

export type TrainStatus = "ON_TIME" | "DELAYED" | "CANCELLED";

export type ModuleKey =
  | "header"
  | "weather"
  | "departures"
  | "arrivals"
  | "disruptions"
  | "quote"
  | "ticker";

export interface StationConfig {
  key: string;
  city: string;
  station: string;
  displayName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  sncfStopAreaId: string;
  disruptionsKeywords: string[];
}

export interface ClientConfig {
  brandTitle: string;
  stationKey: string;
  city: string;
  station: string;
  tickerText: string;
  modules: Record<ModuleKey, boolean>;
}

export interface OverlayQueryOptions {
  layout: LayoutPreset;
  transparent: boolean;
  safeMode: boolean;
  lang: Locale;
  stationKey?: string;
}

export interface SourceResponse<T> {
  ok: boolean;
  source: string;
  updatedAt: string;
  health: HealthState;
  requiresConfig?: boolean;
  message?: string;
  data: T | null;
}

export interface ForecastPoint {
  offsetHours: 1 | 2 | 3;
  time: string;
  temperature: number;
  weatherCode: number;
  condition: string;
}

export interface WeeklyForecastDay {
  date: string;
  weatherCode: number;
  condition: string;
  temperatureMin: number;
  temperatureMax: number;
}

export interface WeatherData {
  city: string;
  station: string;
  temperature: number;
  apparentTemperature?: number;
  windSpeed: number;
  weatherCode: number;
  condition: string;
  forecast: ForecastPoint[];
  weeklyForecast: WeeklyForecastDay[];
}

export interface TrainItem {
  id: string;
  scheduledTime: string;
  displayTime: string;
  endpoint: string;
  lineCode?: string;
  lineName?: string;
  commercialMode?: string;
  network?: string;
  physicalMode?: string;
  dataFreshness?: string;
  additionalInfo?: string[];
  trainNumber?: string;
  platform?: string;
  status: TrainStatus;
  delayMinutes?: number;
}

export interface TrainBoardData {
  kind: "departures" | "arrivals";
  stationName: string;
  items: TrainItem[];
}

export interface DisruptionItem {
  id: string;
  title: string;
  description?: string;
  reason?: string;
  reasons?: string[];
  trainNumbers?: string[];
  severity?: string;
  lines: string[];
  updatedAt?: string;
  url?: string;
}

export interface DisruptionsData {
  stationName: string;
  items: DisruptionItem[];
}

export interface QuoteData {
  quote: string;
  author: string;
  sourceLabel?: string;
  sourceUrl?: string;
  isFallback?: boolean;
}

export interface LiveDataBundle {
  weather: SourceResponse<WeatherData> | null;
  departures: SourceResponse<TrainBoardData> | null;
  arrivals: SourceResponse<TrainBoardData> | null;
  disruptions: SourceResponse<DisruptionsData> | null;
  quote: SourceResponse<QuoteData> | null;
  fetchedAt?: string;
}
