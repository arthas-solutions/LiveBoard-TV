import type { ClientConfig, ModuleKey, StationConfig } from "@/lib/types/liveboard";

export const APP_BRAND = "Bienvenue sur la chaine YouTube Liveboard-TV";

export const MODULE_ORDER: ModuleKey[] = [
  "header",
  "weather",
  "departures",
  "arrivals",
  "disruptions",
  "quote",
  "ticker",
];

export const STATIONS: Record<string, StationConfig> = {
  "paris-montparnasse": {
    key: "paris-montparnasse",
    city: "Paris",
    station: "Gare Montparnasse",
    displayName: "Paris – Gare Montparnasse",
    coordinates: {
      latitude: 48.841172,
      longitude: 2.320514,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87391003",
    disruptionsKeywords: [
      "montparnasse",
      "gare montparnasse",
      "paris montparnasse",
      "transilien",
      "ligne n",
      "ligne 4",
      "ligne 6",
      "ligne 12",
      "ligne 13",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
  "paris-montparnasse-vaugirard": {
    key: "paris-montparnasse-vaugirard",
    city: "Paris",
    station: "Montparnasse Hall 3 Vaugirard",
    displayName: "Paris – Montparnasse Hall 3 Vaugirard",
    coordinates: {
      latitude: 48.837317,
      longitude: 2.314741,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87391102",
    disruptionsKeywords: [
      "montparnasse",
      "vaugirard",
      "hall 3",
      "transilien",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
  "paris-nord": {
    key: "paris-nord",
    city: "Paris",
    station: "Gare du Nord",
    displayName: "Paris – Gare du Nord",
    coordinates: {
      latitude: 48.880136,
      longitude: 2.354851,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87271007",
    disruptionsKeywords: [
      "gare du nord",
      "paris nord",
      "rer b",
      "rer d",
      "ligne b",
      "ligne d",
      "ligne h",
      "ligne k",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
  "paris-est": {
    key: "paris-est",
    city: "Paris",
    station: "Gare de l'Est",
    displayName: "Paris – Gare de l'Est",
    coordinates: {
      latitude: 48.876793,
      longitude: 2.359296,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87113001",
    disruptionsKeywords: [
      "gare de l est",
      "paris est",
      "ligne p",
      "transilien p",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
  "paris-gare-de-lyon": {
    key: "paris-gare-de-lyon",
    city: "Paris",
    station: "Gare de Lyon",
    displayName: "Paris – Gare de Lyon",
    coordinates: {
      latitude: 48.844945,
      longitude: 2.373481,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87686006",
    disruptionsKeywords: [
      "gare de lyon",
      "paris gare de lyon",
      "rer a",
      "rer d",
      "ligne a",
      "ligne d",
      "ligne r",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
  "paris-austerlitz": {
    key: "paris-austerlitz",
    city: "Paris",
    station: "Gare d'Austerlitz",
    displayName: "Paris – Gare d'Austerlitz",
    coordinates: {
      latitude: 48.842285,
      longitude: 2.364891,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87547000",
    disruptionsKeywords: [
      "gare d austerlitz",
      "paris austerlitz",
      "rer c",
      "ligne c",
      "ligne 5",
      "ligne 10",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
  "paris-saint-lazare": {
    key: "paris-saint-lazare",
    city: "Paris",
    station: "Gare Saint-Lazare",
    displayName: "Paris – Saint-Lazare",
    coordinates: {
      latitude: 48.876242,
      longitude: 2.325331,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87384008",
    disruptionsKeywords: [
      "saint-lazare",
      "saint lazare",
      "paris saint-lazare",
      "ligne j",
      "ligne l",
      "ligne 3",
      "ligne 12",
      "ligne 13",
      "ligne 14",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
  "la-defense": {
    key: "la-defense",
    city: "Puteaux",
    station: "La Defense",
    displayName: "Puteaux - La Defense",
    coordinates: {
      latitude: 48.89308,
      longitude: 2.23763,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87382218",
    disruptionsKeywords: [
      "la defense",
      "defense",
      "grande arche",
      "transilien",
      "ligne l",
      "ligne u",
      "rer a",
      "rer e",
      "sncf",
      "bus",
      "metro",
      "tram",
      "t2",
    ],
  },
  "paris-bercy-bourgogne-auvergne": {
    key: "paris-bercy-bourgogne-auvergne",
    city: "Paris",
    station: "Paris Bercy Bourgogne - Pays d'Auvergne",
    displayName: "Paris – Bercy Bourgogne - Pays d'Auvergne",
    coordinates: {
      latitude: 48.839215,
      longitude: 2.382791,
    },
    timezone: "Europe/Paris",
    sncfStopAreaId: "stop_area:SNCF:87686667",
    disruptionsKeywords: [
      "bercy",
      "bercy bourgogne",
      "pays d auvergne",
      "ligne 6",
      "ligne 14",
      "sncf",
      "ter",
      "tgv",
      "bus",
      "metro",
    ],
  },
};

export const DEFAULT_STATION_KEY = "paris-montparnasse";

export const MODULE_DEFAULTS: Record<ModuleKey, boolean> = {
  header: true,
  weather: true,
  departures: true,
  arrivals: true,
  disruptions: true,
  quote: true,
  ticker: true,
};

export function getStationConfig(stationKey?: string): StationConfig {
  if (stationKey && STATIONS[stationKey]) {
    return STATIONS[stationKey];
  }
  return STATIONS[DEFAULT_STATION_KEY];
}

export function getStationList(): StationConfig[] {
  return Object.values(STATIONS);
}

export function getStationNumberByKey(stationKey: string): number | null {
  const list = getStationList();
  const index = list.findIndex((station) => station.key === stationKey);
  return index >= 0 ? index + 1 : null;
}

export function getStationKeyFromUrlParam(stationParam?: string): string | undefined {
  if (!stationParam || stationParam.trim().length === 0) {
    return undefined;
  }

  const trimmed = stationParam.trim();
  const byNumber = Number(trimmed);
  if (Number.isInteger(byNumber) && byNumber >= 1) {
    const list = getStationList();
    const station = list[byNumber - 1];
    return station?.key;
  }

  if (STATIONS[trimmed]) {
    return trimmed;
  }

  return undefined;
}

export function getBrandTitle(city: string, station: string): string {
  return `Livebord ${city} ${station}`;
}

function envOrFallback(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

export function buildDefaultClientConfig(stationKey = DEFAULT_STATION_KEY): ClientConfig {
  const station = getStationConfig(stationKey);
  const brandTitle = envOrFallback(
    process.env.NEXT_PUBLIC_DEFAULT_BRAND_TITLE,
    APP_BRAND,
  );
  const city = envOrFallback(process.env.NEXT_PUBLIC_DEFAULT_CITY, station.city);
  const stationName = envOrFallback(process.env.NEXT_PUBLIC_DEFAULT_STATION, station.station);
  const tickerText = envOrFallback(
    process.env.NEXT_PUBLIC_TICKER_DEFAULT,
    `Bienvenue a ${stationName}. Informations en temps reel mises a jour chaque minute.`,
  );

  return {
    brandTitle,
    stationKey: station.key,
    city,
    station: stationName,
    tickerText,
    modules: { ...MODULE_DEFAULTS },
  };
}
