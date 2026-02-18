"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DisruptionsData,
  LiveDataBundle,
  Locale,
  QuoteData,
  SourceResponse,
  TrainBoardData,
  WeatherData,
} from "@/lib/types/liveboard";

interface LiveDataState {
  bundle: LiveDataBundle;
  isLoading: boolean;
  isRefreshing: boolean;
}

const REFRESH_MS = 60_000;

function downResponse<T>(source: string, message: string): SourceResponse<T> {
  return {
    ok: false,
    source,
    updatedAt: new Date().toISOString(),
    health: "down",
    message,
    data: null,
  };
}

async function fetchSource<T>(endpoint: string, source: string): Promise<SourceResponse<T>> {
  const response = await fetch(endpoint, {
    cache: "no-store",
  });

  const payload = (await response.json()) as SourceResponse<T>;
  if (!payload || typeof payload !== "object") {
    return downResponse(source, "Format de reponse invalide");
  }

  return payload;
}

export function useLiveData(stationKey: string, lang: Locale): LiveDataState {
  const [bundle, setBundle] = useState<LiveDataBundle>({
    weather: null,
    departures: null,
    arrivals: null,
    disruptions: null,
    quote: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const firstLoadRef = useRef(true);

  const fetchAll = useCallback(async () => {
    if (firstLoadRef.current) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const stationQuery = `stationKey=${encodeURIComponent(stationKey)}`;
    const quoteQuery = `lang=${encodeURIComponent(lang)}`;

    const [weatherResult, departuresResult, arrivalsResult, disruptionsResult, quoteResult] =
      await Promise.allSettled([
        fetchSource<WeatherData>(`/api/weather?${stationQuery}`, "Open-Meteo"),
        fetchSource<TrainBoardData>(`/api/trains/departures?${stationQuery}`, "SNCF"),
        fetchSource<TrainBoardData>(`/api/trains/arrivals?${stationQuery}`, "SNCF"),
        fetchSource<DisruptionsData>(`/api/disruptions?${stationQuery}`, "IDFM PRIM"),
        fetchSource<QuoteData>(`/api/quote-of-the-day?${quoteQuery}`, "Wikiquote Parser"),
      ]);

    setBundle({
      weather:
        weatherResult.status === "fulfilled"
          ? weatherResult.value
          : downResponse("Open-Meteo", "Meteo inaccessible"),
      departures:
        departuresResult.status === "fulfilled"
          ? departuresResult.value
          : downResponse("SNCF", "Departs inaccessibles"),
      arrivals:
        arrivalsResult.status === "fulfilled"
          ? arrivalsResult.value
          : downResponse("SNCF", "Arrivees inaccessibles"),
      disruptions:
        disruptionsResult.status === "fulfilled"
          ? disruptionsResult.value
          : downResponse("IDFM PRIM", "Trafic inaccessible"),
      quote:
        quoteResult.status === "fulfilled"
          ? quoteResult.value
          : downResponse("Wikiquote Parser", "Citation inaccessible"),
      fetchedAt: new Date().toISOString(),
    });

    setIsLoading(false);
    setIsRefreshing(false);
    firstLoadRef.current = false;
  }, [lang, stationKey]);

  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      void fetchAll();
    }, 0);

    const interval = window.setInterval(() => {
      void fetchAll();
    }, REFRESH_MS);

    return () => {
      window.clearTimeout(bootstrap);
      window.clearInterval(interval);
    };
  }, [fetchAll]);

  return useMemo(
    () => ({
      bundle,
      isLoading,
      isRefreshing,
    }),
    [bundle, isLoading, isRefreshing],
  );
}
