import { LiveboardOverlay } from "@/components/overlay/liveboard-overlay";
import { getStationKeyFromUrlParam } from "@/lib/config/liveboard";
import type { LayoutPreset, Locale, OverlayQueryOptions } from "@/lib/types/liveboard";

type RawSearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  searchParams: Promise<RawSearchParams>;
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function normalizeLayout(value: string | undefined): LayoutPreset {
  return value === "lowerthird" ? "lowerthird" : "full";
}

function normalizeLocale(value: string | undefined): Locale {
  return value === "en" ? "en" : "fr";
}

function parseQuery(raw: RawSearchParams): OverlayQueryOptions {
  const layout = normalizeLayout(getSingleValue(raw.layout));
  const transparent = getSingleValue(raw.transparent) === "1";
  const safeMode = getSingleValue(raw.safe) === "1";
  const lang = normalizeLocale(getSingleValue(raw.lang));
  const stationKey = getStationKeyFromUrlParam(getSingleValue(raw.station));

  return {
    layout,
    transparent,
    safeMode,
    lang,
    stationKey,
  };
}

export default async function Home({ searchParams }: PageProps) {
  const raw = await searchParams;
  const queryOptions = parseQuery(raw);

  return <LiveboardOverlay queryOptions={queryOptions} />;
}
