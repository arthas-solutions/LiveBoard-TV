import type { Locale } from "@/lib/types/liveboard";

export interface Dictionary {
  labels: {
    updatedAt: string;
    departures: string;
    arrivals: string;
    weather: string;
    disruptions: string;
    quote: string;
    ticker: string;
    configRequired: string;
    unavailable: string;
    source: string;
    platform: string;
    train: string;
    trains: string;
    from: string;
    to: string;
    feelLike: string;
    wind: string;
    now: string;
    weekForecast: string;
    day: string;
    min: string;
    max: string;
    hot: string;
    cold: string;
    reason: string;
    condition: string;
    noDelayedTrains: string;
    reasonUnknown: string;
  };
  status: {
    ON_TIME: string;
    DELAYED: string;
    CANCELLED: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  fr: {
    labels: {
      updatedAt: "MAJ",
      departures: "Departs",
      arrivals: "Arrivees",
      weather: "Meteo",
      disruptions: "Perturbations",
      quote: "Phrase du jour",
      ticker: "Fil d'info",
      configRequired: "CONFIG REQUISE",
      unavailable: "Donnees momentanement indisponibles",
      source: "Source",
      platform: "Voie",
      train: "Train",
      trains: "Trains",
      from: "Provenance",
      to: "Destination",
      feelLike: "Ressenti",
      wind: "Vent",
      now: "Maintenant",
      weekForecast: "Semaine",
      day: "Jour",
      min: "Min",
      max: "Max",
      hot: "Chaud",
      cold: "Froid",
      reason: "Raison",
      condition: "Condition",
      noDelayedTrains: "Aucun train en retard sur le tableau",
      reasonUnknown: "Non precisee",
    },
    status: {
      ON_TIME: "A l'heure",
      DELAYED: "Retard",
      CANCELLED: "Supprime",
    },
  },
  en: {
    labels: {
      updatedAt: "UPD",
      departures: "Departures",
      arrivals: "Arrivals",
      weather: "Weather",
      disruptions: "Disruptions",
      quote: "Quote of the day",
      ticker: "Ticker",
      configRequired: "CONFIG REQUIRED",
      unavailable: "Data temporarily unavailable",
      source: "Source",
      platform: "Platform",
      train: "Train",
      trains: "Trains",
      from: "From",
      to: "To",
      feelLike: "Feels like",
      wind: "Wind",
      now: "Now",
      weekForecast: "Week",
      day: "Day",
      min: "Min",
      max: "Max",
      hot: "Warm",
      cold: "Cold",
      reason: "Reason",
      condition: "Condition",
      noDelayedTrains: "No delayed train on the board",
      reasonUnknown: "Not specified",
    },
    status: {
      ON_TIME: "On time",
      DELAYED: "Delayed",
      CANCELLED: "Cancelled",
    },
  },
};

export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang] ?? dictionaries.fr;
}
