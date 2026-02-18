import { buildDefaultClientConfig, getStationConfig } from "@/lib/config/liveboard";
import type { ClientConfig } from "@/lib/types/liveboard";

export const LOCAL_CONFIG_KEY = "liveboard-config-v1";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function loadClientConfig(): ClientConfig {
  const defaults = buildDefaultClientConfig();

  if (typeof window === "undefined") {
    return defaults;
  }

  const raw = window.localStorage.getItem(LOCAL_CONFIG_KEY);
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ClientConfig>;
    const merged = {
      ...defaults,
      ...parsed,
      modules: {
        ...defaults.modules,
        ...(parsed.modules ?? {}),
      },
    };

    const station = getStationConfig(merged.stationKey);
    const stationIsPresetName = normalizeText(merged.station) === normalizeText(station.station);
    const cityIsStaleForPreset = normalizeText(merged.city) !== normalizeText(station.city);

    return {
      ...merged,
      city: stationIsPresetName && cityIsStaleForPreset ? station.city : merged.city,
    };
  } catch {
    return defaults;
  }
}

export function saveClientConfig(nextConfig: ClientConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(nextConfig));
}
