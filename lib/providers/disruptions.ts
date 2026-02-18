import { getStationConfig } from "@/lib/config/liveboard";
import { buildResponse, fetchJson, isConfigMissing } from "@/lib/providers/http";
import type {
  DisruptionItem,
  DisruptionsData,
  SourceResponse,
  StationConfig,
} from "@/lib/types/liveboard";

const IDFM_ENDPOINT = "https://prim.iledefrance-mobilites.fr/marketplace/general-message";
const SNCF_COVERAGE = "https://api.sncf.com/v1/coverage/sncf";

type NavitiaBoardDisruptionsResponse = {
  disruptions?: unknown[];
};

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractString(input: unknown): string | undefined {
  if (typeof input === "string") {
    return input;
  }

  if (!input || typeof input !== "object") {
    return undefined;
  }

  const node = input as Record<string, unknown>;
  const candidates = [
    node.value,
    node.text,
    node.message,
    node.MessageText,
    node.DescriptionText,
    node.SummaryText,
    node["#text"],
    node["$t"],
  ];

  for (const candidate of candidates) {
    const result = extractString(candidate);
    if (result) {
      return result;
    }
  }

  for (const value of Object.values(node)) {
    const result = extractString(value);
    if (result) {
      return result;
    }
  }

  return undefined;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForCompare(value: string): string {
  return normalizeSpace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isMeaningful(value: string | undefined): value is string {
  return Boolean(value && normalizeSpace(value).length > 2);
}

function collectByKeyPattern(
  input: unknown,
  keyPattern: RegExp,
  depth = 0,
): string[] {
  if (!input || depth > 7) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((entry) => collectByKeyPattern(entry, keyPattern, depth + 1));
  }

  if (typeof input !== "object") {
    return [];
  }

  const node = input as Record<string, unknown>;
  const collected: string[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (keyPattern.test(key)) {
      const extracted = extractString(value);
      if (isMeaningful(extracted)) {
        collected.push(normalizeSpace(extracted));
      }
    }
    collected.push(...collectByKeyPattern(value, keyPattern, depth + 1));
  }

  return collected;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = normalizeForCompare(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }
  return output;
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
}

function extractTrainNumbersFromRaw(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const candidates: string[] = [];
  const byNavitiaId = value.match(/:\d{4}-\d{2}-\d{2}:([A-Za-z0-9]+):/);
  if (byNavitiaId?.[1]) {
    candidates.push(byNavitiaId[1]);
  }

  const alnumMatches = value.match(/\b[A-Za-z]?\d{3,6}\b/g) ?? [];
  candidates.push(...alnumMatches);

  if (/^[A-Za-z0-9]{3,8}$/.test(value)) {
    candidates.push(value);
  }

  return dedupe(candidates.map((entry) => entry.trim()));
}

function extractReasons(
  message: Record<string, unknown>,
  content: Record<string, unknown>,
  title: string,
  description?: string,
): string[] {
  const directCandidates = [
    extractString(message.Cause),
    extractString(message.Reason),
    extractString(message.MessageCause),
    extractString(message.ReasonText),
    extractString(message.ReasonCode),
    extractString(content.Cause),
    extractString(content.Reason),
    extractString(content.MessageCause),
    extractString(content.ReasonText),
  ].filter(isMeaningful);

  const keyPatternCandidates = [
    ...collectByKeyPattern(message, /(cause|reason|motif)/i),
    ...collectByKeyPattern(content, /(cause|reason|motif)/i),
  ];

  const fromDescription = description
    ? (() => {
        const match = description.match(
          /(?:raison|motif|cause)\s*[:\-]\s*([^\n\r.;]+)/i,
        );
        return isMeaningful(match?.[1]) ? normalizeSpace(match[1]) : undefined;
      })()
    : undefined;

  const candidates = dedupe([
    ...directCandidates.map((value) => normalizeSpace(value)),
    ...keyPatternCandidates,
    ...(fromDescription ? [fromDescription] : []),
  ]);

  const avoid = new Set<string>([
    normalizeForCompare(title),
    normalizeForCompare(description ?? ""),
  ]);

  const reasons: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeForCompare(candidate);
    if (!normalized || avoid.has(normalized)) {
      continue;
    }
    reasons.push(candidate);
  }

  return reasons;
}

function authHeaderFromToken(token: string): string {
  return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

function parseSncfDisruption(raw: unknown, index: number): DisruptionItem {
  const disruption = (raw as Record<string, unknown>) ?? {};
  const severityNode = (disruption.severity as Record<string, unknown>) ?? {};

  const messageTexts = toArray(disruption.messages as unknown[] | undefined)
    .map((entry) => extractString((entry as Record<string, unknown>)?.text))
    .filter((value): value is string => Boolean(value));

  const impactedStops = toArray(disruption.impacted_objects as unknown[] | undefined).flatMap(
    (objectNode) =>
      toArray(
        ((objectNode as Record<string, unknown>)?.impacted_stops as unknown[] | undefined) ?? [],
      ),
  );

  const impactedCauses = impactedStops
    .map((stop) => toStringValue((stop as Record<string, unknown>)?.cause))
    .filter((value): value is string => Boolean(value));

  const impactedTrips = toArray(disruption.impacted_objects as unknown[] | undefined)
    .map((objectNode) =>
      toStringValue(
        (((objectNode as Record<string, unknown>)?.pt_object as Record<string, unknown>)?.trip as Record<
          string,
          unknown
        >)?.name,
      ),
    )
    .filter((value): value is string => Boolean(value));

  const trainNumbers = dedupe(
    toArray(disruption.impacted_objects as unknown[] | undefined)
      .flatMap((objectNode) => {
        const ptObject = ((objectNode as Record<string, unknown>)?.pt_object as Record<string, unknown>) ?? {};
        const trip = (ptObject.trip as Record<string, unknown>) ?? {};
        return [
          ...extractTrainNumbersFromRaw(toStringValue(trip.name)),
          ...extractTrainNumbersFromRaw(toStringValue(ptObject.name)),
          ...extractTrainNumbersFromRaw(toStringValue(ptObject.id)),
        ];
      })
      .filter((entry) => entry.length > 0),
  );

  const reasonCandidates = dedupe(
    [
      toStringValue(disruption.cause),
      ...impactedCauses,
      ...messageTexts,
    ].filter((value): value is string => Boolean(value)),
  );

  const reasons = reasonCandidates.slice(0, 4);
  const reason = reasons[0];
  const severity =
    toStringValue(severityNode.name) ?? toStringValue(severityNode.effect) ?? "retard train";
  const title = reason ?? messageTexts[0] ?? "Retard train SNCF";
  const description =
    impactedTrips.length > 0 ? `Trains impactes: ${impactedTrips.slice(0, 4).join(", ")}` : undefined;

  const lines = [
    "SNCF",
    toStringValue(severityNode.effect),
    toStringValue(disruption.status),
  ].filter((line): line is string => Boolean(line));

  return {
    id: String(disruption.id ?? disruption.disruption_id ?? disruption.impact_id ?? `sncf-${index}`),
    title,
    description,
    reason,
    reasons: reasons.length > 0 ? reasons : undefined,
    trainNumbers: trainNumbers.length > 0 ? trainNumbers.slice(0, 6) : undefined,
    severity,
    lines: dedupe(lines).slice(0, 3),
    updatedAt: toStringValue(disruption.updated_at),
    url: undefined,
  };
}

async function fetchSncfDisruptions(
  station: StationConfig,
  token: string,
): Promise<DisruptionItem[]> {
  const stopArea = encodeURIComponent(station.sncfStopAreaId);
  const [departuresResult, arrivalsResult] = await Promise.allSettled([
    fetchJson<NavitiaBoardDisruptionsResponse>(
      `${SNCF_COVERAGE}/stop_areas/${stopArea}/departures?count=80&depth=3&data_freshness=realtime`,
      {
        headers: {
          Authorization: authHeaderFromToken(token),
        },
        next: { revalidate: 60 },
      },
    ),
    fetchJson<NavitiaBoardDisruptionsResponse>(
      `${SNCF_COVERAGE}/stop_areas/${stopArea}/arrivals?count=80&depth=3&data_freshness=realtime`,
      {
        headers: {
          Authorization: authHeaderFromToken(token),
        },
        next: { revalidate: 60 },
      },
    ),
  ]);

  const disruptions = [
    ...(departuresResult.status === "fulfilled" ? toArray(departuresResult.value.disruptions) : []),
    ...(arrivalsResult.status === "fulfilled" ? toArray(arrivalsResult.value.disruptions) : []),
  ];

  const uniqueDisruptions = uniqueBy(disruptions, (entry) => {
    const node = (entry as Record<string, unknown>) ?? {};
    return String(node.id ?? node.disruption_id ?? node.impact_id ?? "");
  });

  return uniqueDisruptions.map((entry, index) => parseSncfDisruption(entry, index));
}

function extractInfoMessages(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const siri = (root.Siri as Record<string, unknown>) ?? {};
  const serviceDelivery = (siri.ServiceDelivery as Record<string, unknown>) ?? {};
  const deliveries = toArray(
    serviceDelivery.GeneralMessageDelivery as Record<string, unknown>[] | undefined,
  );

  const messages = deliveries.flatMap((delivery) =>
    toArray((delivery as Record<string, unknown>).InfoMessage as unknown[] | undefined),
  );

  if (messages.length > 0) {
    return messages;
  }

  if (Array.isArray(root.messages)) {
    return root.messages;
  }

  return [];
}

function parseDisruption(raw: unknown, index: number): DisruptionItem {
  const message = (raw as Record<string, unknown>) ?? {};
  const content = (message.Content as Record<string, unknown>) ?? {};

  const title =
    extractString(message.MessageType) ??
    extractString(content.SummaryText) ??
    extractString(content.MessageText) ??
    "Information trafic";

  const description = extractString(content.DescriptionText) ?? extractString(content.MessageText);
  const reasons = extractReasons(message, content, title, description);
  const reason = reasons[0];

  const lines = [
    extractString(message.LineRef),
    extractString(message.InfoChannelRef),
    extractString(message.ValidityPeriod),
  ]
    .filter((line): line is string => Boolean(line))
    .slice(0, 3);

  return {
    id: String(message.InfoMessageIdentifier ?? message.id ?? `idfm-${index}`),
    title,
    description,
    reason,
    reasons: reasons.length > 0 ? reasons.slice(0, 4) : undefined,
    severity: extractString(message.Severity),
    lines,
    updatedAt: extractString(message.RecordedAtTime),
    url: extractString(message.InfoMessageRef),
  };
}

function isRelevant(item: DisruptionItem, station: StationConfig): boolean {
  const haystack = [item.title, item.description ?? "", item.lines.join(" ")]
    .join(" ")
    .toLowerCase();
  return station.disruptionsKeywords.some((keyword) => haystack.includes(keyword));
}

export async function getDisruptions(
  stationKey?: string,
): Promise<SourceResponse<DisruptionsData>> {
  const apiKey = process.env.IDFM_PRIM_API_KEY;
  const sncfToken = process.env.SNCF_API_TOKEN;

  const station = getStationConfig(stationKey);
  const sncfItems =
    sncfToken && sncfToken.trim().length > 0 ? await fetchSncfDisruptions(station, sncfToken) : [];

  if (isConfigMissing(apiKey) && isConfigMissing(sncfToken)) {
    return buildResponse<DisruptionsData>({
      source: "IDFM PRIM",
      data: null,
      health: "config",
      ok: false,
      requiresConfig: true,
      message: "IDFM_PRIM_API_KEY ou SNCF_API_TOKEN manquant",
    });
  }

  if (isConfigMissing(apiKey) && !isConfigMissing(sncfToken)) {
    const data: DisruptionsData = {
      stationName: station.displayName,
      items: sncfItems.slice(0, 6),
    };

    return buildResponse({
      source: "SNCF",
      data,
      health: sncfItems.length > 0 ? "ok" : "degraded",
      ok: true,
      message:
        sncfItems.length > 0
          ? "IDFM non configure, perturbations SNCF affichees"
          : "Aucune perturbation detectee (mode SNCF uniquement)",
    });
  }

  try {
    let selected: DisruptionItem[] = [];

    if (!isConfigMissing(apiKey)) {
      const payload = await fetchJson<unknown>(IDFM_ENDPOINT, {
        headers: {
          apikey: apiKey as string,
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      });

      const messages = extractInfoMessages(payload).map((entry, index) =>
        parseDisruption(entry, index),
      );
      const relevant = messages.filter((item) => isRelevant(item, station));
      selected = relevant.length > 0 ? relevant : messages;
    }

    selected = uniqueBy(
      [...sncfItems, ...selected],
      (item) => normalizeForCompare(`${item.title}|${item.reason ?? ""}|${item.description ?? ""}`),
    ).slice(0, 6);

    const data: DisruptionsData = {
      stationName: station.displayName,
      items: selected,
    };

    return buildResponse({
      source: sncfItems.length > 0 ? "IDFM PRIM + SNCF" : "IDFM PRIM",
      data,
      health: selected.length > 0 ? "ok" : "degraded",
      ok: true,
      message: selected.length === 0 ? "Aucune perturbation detectee" : undefined,
    });
  } catch (error) {
    if (sncfItems.length > 0) {
      const data: DisruptionsData = {
        stationName: station.displayName,
        items: sncfItems.slice(0, 6),
      };
      return buildResponse({
        source: "SNCF",
        data,
        health: "ok",
        ok: true,
        message: "IDFM indisponible, perturbations SNCF affichees",
      });
    }

    return buildResponse<DisruptionsData>({
      source: "IDFM PRIM",
      data: null,
      health: "down",
      ok: false,
      message: error instanceof Error ? error.message : "IDFM provider unavailable",
    });
  }
}
