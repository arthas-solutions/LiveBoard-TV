import { getStationConfig } from "@/lib/config/liveboard";
import { buildResponse, fetchJson, isConfigMissing } from "@/lib/providers/http";
import type {
  SourceResponse,
  StationConfig,
  TrainBoardData,
  TrainItem,
  TrainStatus,
} from "@/lib/types/liveboard";
import { differenceInMinutes, formatShortTime, parseNavitiaDateTime } from "@/lib/utils/date";

type BoardKind = "departures" | "arrivals";

type NavitiaBoardResponse = {
  departures?: unknown[];
  arrivals?: unknown[];
  stop_areas?: Array<{
    name?: string;
  }>;
  origins?: Array<{
    id?: string;
    name?: string;
    label?: string;
  }>;
  terminus?: Array<{
    id?: string;
    name?: string;
    label?: string;
  }>;
  notes?: Array<{
    id?: string;
    value?: string;
    type?: string;
  }>;
};

type NavitiaVehicleJourneyResponse = {
  vehicle_journeys?: Array<{
    stop_times?: Array<{
      stop_point?: {
        name?: string;
      };
    }>;
  }>;
};

interface BoardParsingContext {
  stationAliases: string[];
  originNameById: Map<string, string>;
  terminusNameById: Map<string, string>;
  noteById: Map<string, string>;
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = normalizeForMatch(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    output.push(value);
    seen.add(normalized);
  }
  return output;
}

function formatInfoToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeStation(value: string, stationAliases: string[]): boolean {
  const normalized = normalizeForMatch(value);
  return stationAliases.some((alias) => normalized.includes(alias));
}

function splitRouteName(value: string): string[] {
  return value
    .split(/\s[-–>]\s|\/|↔/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function collapseParenthesizedDuplicate(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(.+?)\s*\((.+)\)$/);
  if (!match) {
    return cleaned;
  }

  const before = match[1].trim();
  const inside = match[2].trim();
  return normalizeForMatch(before) === normalizeForMatch(inside) ? before : cleaned;
}

function collapseRepeatedHalf(value: string): string {
  const words = value.trim().split(/\s+/g);
  if (words.length < 4 || words.length % 2 !== 0) {
    return value;
  }

  const half = words.length / 2;
  const firstHalf = words.slice(0, half).join(" ");
  const secondHalf = words.slice(half).join(" ");
  return normalizeForMatch(firstHalf) === normalizeForMatch(secondHalf) ? firstHalf : value;
}

function sanitizeEndpoint(value: string): string {
  let output = collapseParenthesizedDuplicate(value);

  const separatedParts = output
    .split(/\s(?:-|–|>|\/|↔|\|)\s/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (separatedParts.length > 1) {
    const deduplicated: string[] = [];
    const seen = new Set<string>();
    for (const part of separatedParts) {
      const normalized = normalizeForMatch(part);
      if (!seen.has(normalized)) {
        deduplicated.push(part);
        seen.add(normalized);
      }
    }
    output = deduplicated.join(" - ");
  }

  output = collapseRepeatedHalf(output);
  return output.trim() || "-";
}

function pickEndpointFromRouteName(routeName: string, stationAliases: string[]): string | null {
  const parts = splitRouteName(routeName);
  if (parts.length === 0) {
    return null;
  }

  const nonStation = parts.find((part) => !looksLikeStation(part, stationAliases));
  return nonStation ?? null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function buildNameMap(values: Array<{ id?: string; name?: string; label?: string }> | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of values ?? []) {
    const id = toStringValue(entry.id);
    const name = toStringValue(entry.name) ?? toStringValue(entry.label);
    if (id && name) {
      map.set(id, sanitizeEndpoint(name));
    }
  }
  return map;
}

function buildNoteMap(values: Array<{ id?: string; value?: string; type?: string }> | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of values ?? []) {
    const id = toStringValue(entry.id);
    const value = toStringValue(entry.value);
    if (id && value) {
      map.set(id, formatInfoToken(value));
    }
  }
  return map;
}

function extractLinkIdsFromNodes(
  nodes: unknown[],
  predicate: (node: Record<string, unknown>) => boolean,
): string[] {
  const ids: string[] = [];
  for (const rawNode of nodes) {
    const node = (rawNode as Record<string, unknown>) ?? {};
    if (!predicate(node)) {
      continue;
    }

    const id = toStringValue(node.id);
    if (id) {
      ids.push(id);
    }
  }
  return uniqueNormalized(ids);
}

function extractLinkIdsFromCollection(
  links: unknown,
  predicate: (node: Record<string, unknown>) => boolean,
): string[] {
  if (!Array.isArray(links)) {
    return [];
  }
  return extractLinkIdsFromNodes(links, predicate);
}

function resolveLinkedEndpointName(
  kind: BoardKind,
  item: Record<string, unknown>,
  context: BoardParsingContext,
): string | null {
  const stopDateTime = (item.stop_date_time as Record<string, unknown>) ?? {};
  const display = (item.display_informations as Record<string, unknown>) ?? {};
  const displayLinks = Array.isArray(display.links) ? display.links : [];
  const collection = [
    ...(Array.isArray(stopDateTime.links) ? stopDateTime.links : []),
    ...(Array.isArray(item.links) ? item.links : []),
    ...displayLinks,
  ];

  const candidateIds = extractLinkIdsFromNodes(collection, (node) => {
    const type = toStringValue(node.type);
    const rel = toStringValue(node.rel);
    const category = toStringValue(node.category);
    if (type !== "stop_area") {
      return false;
    }

    if (kind === "departures") {
      return rel === "terminus" || category === "terminus";
    }

    return rel === "origins" || rel === "origin" || category === "origin";
  });

  const map = kind === "departures" ? context.terminusNameById : context.originNameById;
  for (const id of candidateIds) {
    const name = map.get(id);
    if (name) {
      return name;
    }
  }

  return null;
}

function extractPlatformFromNotes(noteValues: string[]): string | undefined {
  for (const note of noteValues) {
    const match = note.match(/\b(?:voie|quai|platform)\s*[:\-]?\s*([A-Za-z0-9-]{1,6})\b/i);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  for (const note of noteValues) {
    if (note.length <= 6 && /^[A-Za-z0-9-]+$/.test(note)) {
      return note.toUpperCase();
    }
  }

  return undefined;
}

function normalizeDataFreshness(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toLowerCase();
  if (normalized === "realtime") {
    return "Temps reel";
  }
  if (normalized === "base_schedule") {
    return undefined;
  }
  return formatInfoToken(value);
}

function extractVehicleJourneyId(item: Record<string, unknown>): string | null {
  const links = item.links;
  if (!Array.isArray(links)) {
    return null;
  }

  for (const rawLink of links) {
    const link = (rawLink as Record<string, unknown>) ?? {};
    const type = toStringValue(link.type);
    const id = toStringValue(link.id);
    const href = toStringValue(link.href);

    if (type === "vehicle_journey" && id) {
      return id;
    }

    if (id?.startsWith("vehicle_journey:")) {
      return id;
    }

    if (href?.includes("/vehicle_journeys/")) {
      const match = href.match(/vehicle_journeys\/([^?]+)/);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }
  }

  return null;
}

async function fetchArrivalOriginFromVehicleJourney(params: {
  rawItem: unknown;
  token: string;
  stationAliases: string[];
}): Promise<string | null> {
  const item = (params.rawItem as Record<string, unknown>) ?? {};
  const vehicleJourneyId = extractVehicleJourneyId(item);

  if (!vehicleJourneyId) {
    return null;
  }

  const endpoint = `https://api.sncf.com/v1/coverage/sncf/vehicle_journeys/${encodeURIComponent(
    vehicleJourneyId,
  )}?depth=2`;

  try {
    const payload = await fetchJson<NavitiaVehicleJourneyResponse>(endpoint, {
      headers: {
        Authorization: authHeaderFromToken(params.token),
      },
      next: { revalidate: 60 },
    });

    const stopTimes = payload.vehicle_journeys?.[0]?.stop_times ?? [];
    const candidates = stopTimes
      .map((stopTime) => toStringValue(stopTime.stop_point?.name))
      .filter((name): name is string => Boolean(name));

    const nonStation = candidates.find(
      (candidate) => !looksLikeStation(candidate, params.stationAliases),
    );
    return nonStation ?? candidates[0] ?? null;
  } catch {
    return null;
  }
}

function resolveEndpoint(
  kind: BoardKind,
  item: Record<string, unknown>,
  stationAliases: string[],
  linkedEndpoint: string | null,
): string {
  const display = (item.display_informations as Record<string, unknown>) ?? {};
  const route = (item.route as Record<string, unknown>) ?? {};
  const routeDirection = (route.direction as Record<string, unknown>) ?? {};
  const ptDisplay = (item.pt_display_informations as Record<string, unknown>) ?? {};

  if (linkedEndpoint) {
    return sanitizeEndpoint(linkedEndpoint);
  }

  const routeName = toStringValue(route.name);
  const fromRouteName = routeName ? pickEndpointFromRouteName(routeName, stationAliases) : null;

  const candidates = [
    toStringValue(display.direction),
    toStringValue(ptDisplay.direction),
    toStringValue(routeDirection.name),
    fromRouteName,
    toStringValue(display.headsign),
    toStringValue(display.label),
    toStringValue(display.name),
    routeName,
    toStringValue(route.label),
  ].filter((value): value is string => Boolean(value));

  if (kind === "arrivals") {
    const nonStation = candidates.find((candidate) => !looksLikeStation(candidate, stationAliases));
    if (nonStation) {
      return sanitizeEndpoint(nonStation);
    }
  }

  return sanitizeEndpoint(candidates[0] ?? "-");
}

function dedupeTrainItems(items: TrainItem[]): TrainItem[] {
  const seen = new Set<string>();
  const output: TrainItem[] = [];

  for (const item of items) {
    const key = [
      item.scheduledTime,
      normalizeForMatch(item.endpoint),
      normalizeForMatch(item.lineCode ?? ""),
      normalizeForMatch(item.trainNumber ?? ""),
      normalizeForMatch(item.platform ?? ""),
      item.status,
      String(item.delayMinutes ?? 0),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}

function navitiaDateTime(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}${sec}`;
}

function buildBoardEndpoint(params: {
  stationStopAreaId: string;
  kind: BoardKind;
  fromDateTime: string;
  count: number;
  depth: number;
}): string {
  return (
    `https://api.sncf.com/v1/coverage/sncf/stop_areas/${encodeURIComponent(params.stationStopAreaId)}` +
    `/${params.kind}?from_datetime=${encodeURIComponent(params.fromDateTime)}` +
    `&count=${params.count}&depth=${params.depth}`
  );
}

async function fetchBoardPayload(params: {
  stationStopAreaId: string;
  kind: BoardKind;
  fromDateTime: string;
  token: string;
  count: number;
}): Promise<NavitiaBoardResponse> {
  const attempts = [
    { count: params.count, depth: 2 },
    { count: Math.max(8, Math.min(params.count, 12)), depth: 1 },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    const endpoint = buildBoardEndpoint({
      stationStopAreaId: params.stationStopAreaId,
      kind: params.kind,
      fromDateTime: params.fromDateTime,
      count: attempt.count,
      depth: attempt.depth,
    });

    try {
      return await fetchJson<NavitiaBoardResponse>(endpoint, {
        headers: {
          Authorization: authHeaderFromToken(params.token),
        },
        next: { revalidate: 60 },
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("SNCF board unavailable");
}

function parseStatus(params: {
  scheduled: Date | null;
  realtime: Date | null;
  additionalInformation: unknown;
}): { status: TrainStatus; delayMinutes?: number } {
  const info = Array.isArray(params.additionalInformation)
    ? params.additionalInformation.map((entry) => String(entry).toLowerCase())
    : [];

  if (info.some((entry) => entry.includes("cancel") || entry.includes("suppr"))) {
    return { status: "CANCELLED" };
  }

  if (params.scheduled && params.realtime) {
    const delay = differenceInMinutes(params.realtime, params.scheduled);
    if (delay >= 2) {
      return {
        status: "DELAYED",
        delayMinutes: delay,
      };
    }
  }

  return { status: "ON_TIME" };
}

function parseBoardItem(
  kind: BoardKind,
  rawItem: unknown,
  index: number,
  context: BoardParsingContext,
): TrainItem {
  const item = (rawItem as Record<string, unknown>) ?? {};
  const stopDateTime = (item.stop_date_time as Record<string, unknown>) ?? {};
  const display = (item.display_informations as Record<string, unknown>) ?? {};
  const route = (item.route as Record<string, unknown>) ?? {};
  const line = (route.line as Record<string, unknown>) ?? {};

  const rawScheduled =
    kind === "departures"
      ? ((stopDateTime.base_departure_date_time as string) ??
        (stopDateTime.departure_date_time as string))
      : ((stopDateTime.base_arrival_date_time as string) ??
        (stopDateTime.arrival_date_time as string));

  const rawRealtime =
    kind === "departures"
      ? ((stopDateTime.departure_date_time as string) ?? rawScheduled)
      : ((stopDateTime.arrival_date_time as string) ?? rawScheduled);

  const scheduled = parseNavitiaDateTime(rawScheduled ?? "");
  const realtime = parseNavitiaDateTime(rawRealtime ?? "");

  const status = parseStatus({
    scheduled,
    realtime,
    additionalInformation:
      stopDateTime.additional_informations ??
      item.additional_informations ??
      display.additional_informations,
  });

  const linkedEndpoint = resolveLinkedEndpointName(kind, item, context);
  const endpoint = resolveEndpoint(kind, item, context.stationAliases, linkedEndpoint);

  const displayLinks = Array.isArray(display.links) ? display.links : [];
  const noteIds = uniqueNormalized([
    ...extractLinkIdsFromCollection(stopDateTime.links, (node) => {
      const type = toStringValue(node.type);
      return type === "note" || type === "notes";
    }),
    ...extractLinkIdsFromCollection(item.links, (node) => {
      const type = toStringValue(node.type);
      return type === "note" || type === "notes";
    }),
    ...extractLinkIdsFromCollection(displayLinks, (node) => {
      const type = toStringValue(node.type);
      return type === "note" || type === "notes";
    }),
  ]);

  const noteValues = noteIds
    .map((id) => context.noteById.get(id))
    .filter((value): value is string => Boolean(value));

  const platformFromNotes = extractPlatformFromNotes(noteValues);

  const platform =
    (stopDateTime.platform as string) ??
    (stopDateTime.platform_code as string) ??
    ((item.stop_point as Record<string, unknown>)?.platform_code as string) ??
    platformFromNotes ??
    undefined;

  const lineCode =
    toStringValue(line.code) ??
    toStringValue(display.code) ??
    toStringValue(display.label) ??
    undefined;

  const lineName =
    toStringValue(line.name) ??
    toStringValue((route as Record<string, unknown>).name) ??
    toStringValue(display.label) ??
    undefined;

  const commercialMode =
    toStringValue(display.commercial_mode) ??
    toStringValue((line.commercial_mode as Record<string, unknown>)?.name) ??
    undefined;
  const network =
    toStringValue(display.network) ??
    toStringValue((line.network as Record<string, unknown>)?.name) ??
    undefined;
  const linePhysicalModes = Array.isArray(line.physical_modes) ? line.physical_modes : [];
  const physicalMode =
    toStringValue(display.physical_mode) ??
    toStringValue(((linePhysicalModes[0] as Record<string, unknown>) ?? {}).name) ??
    undefined;

  const dataFreshness = normalizeDataFreshness(toStringValue(stopDateTime.data_freshness));

  const rawAdditional = Array.isArray(stopDateTime.additional_informations)
    ? stopDateTime.additional_informations.map((entry) => String(entry))
    : [];
  const additionalInfo = uniqueNormalized(
    [...rawAdditional, ...noteValues]
      .map((entry) => formatInfoToken(entry))
      .filter((entry) => entry.length > 0),
  );

  const trainNumberCandidate =
    toStringValue(display.headsign) ??
    toStringValue(display.trip_short_name) ??
    toStringValue(display.code) ??
    toStringValue(display.name) ??
    undefined;

  const trainNumber =
    trainNumberCandidate && lineCode && normalizeForMatch(trainNumberCandidate) === normalizeForMatch(lineCode)
      ? undefined
      : trainNumberCandidate;

  const displayDate = realtime ?? scheduled ?? new Date();

  return {
    id: String(item.id ?? `${kind}-${index}-${rawRealtime ?? rawScheduled ?? Date.now()}`),
    scheduledTime: displayDate.toISOString(),
    displayTime: formatShortTime(displayDate),
    endpoint,
    lineCode,
    lineName,
    commercialMode,
    network,
    physicalMode,
    dataFreshness,
    additionalInfo: additionalInfo.length > 0 ? additionalInfo : undefined,
    trainNumber,
    platform,
    status: status.status,
    delayMinutes: status.delayMinutes,
  };
}

function authHeaderFromToken(token: string): string {
  return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

export async function getTrainBoard(params: {
  kind: BoardKind;
  stationKey?: string;
  count: number;
}): Promise<SourceResponse<TrainBoardData>> {
  const token = process.env.SNCF_API_TOKEN;

  if (isConfigMissing(token)) {
    return buildResponse<TrainBoardData>({
      source: "SNCF",
      data: null,
      health: "config",
      ok: false,
      requiresConfig: true,
      message: "SNCF_API_TOKEN manquant",
    });
  }

  const station: StationConfig = getStationConfig(params.stationKey);
  const now = navitiaDateTime(new Date());
  const stationAliases = [
    station.station,
    station.city,
    station.displayName,
    `${station.city} ${station.station}`.replace("Gare ", ""),
    "montparnasse",
    "paris montparnasse",
  ]
    .map((entry) => normalizeForMatch(entry))
    .filter((entry) => entry.length > 0);

  try {
    const payload = await fetchBoardPayload({
      stationStopAreaId: station.sncfStopAreaId,
      kind: params.kind,
      fromDateTime: now,
      token: token as string,
      count: params.count,
    });

    const rawItems = (payload[params.kind] ?? []) as unknown[];
    const selectedRawItems = rawItems.slice(0, params.count);
    const parsingContext: BoardParsingContext = {
      stationAliases,
      originNameById: buildNameMap(payload.origins),
      terminusNameById: buildNameMap(payload.terminus),
      noteById: buildNoteMap(payload.notes),
    };
    const parsedItems = selectedRawItems.map((item, index) =>
      parseBoardItem(params.kind, item, index, parsingContext),
    );

    const items =
      params.kind === "arrivals"
        ? await Promise.all(
            parsedItems.map(async (parsedItem, index) => {
              if (!looksLikeStation(parsedItem.endpoint, stationAliases)) {
                return parsedItem;
              }

              const origin = await fetchArrivalOriginFromVehicleJourney({
                rawItem: selectedRawItems[index],
                token: token as string,
                stationAliases,
              });

              return origin ? { ...parsedItem, endpoint: sanitizeEndpoint(origin) } : parsedItem;
            }),
          )
        : parsedItems;
    const dedupedItems = dedupeTrainItems(items);

    const data: TrainBoardData = {
      kind: params.kind,
      stationName: payload.stop_areas?.[0]?.name ?? station.displayName,
      items: dedupedItems,
    };

    return buildResponse({
      source: "SNCF",
      data,
      health: dedupedItems.length > 0 ? "ok" : "degraded",
      ok: true,
      message: dedupedItems.length === 0 ? "Aucun train trouve" : undefined,
    });
  } catch (error) {
    return buildResponse<TrainBoardData>({
      source: "SNCF",
      data: null,
      health: "down",
      ok: false,
      message: error instanceof Error ? error.message : "SNCF provider unavailable",
    });
  }
}
