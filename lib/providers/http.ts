import type { HealthState, SourceResponse } from "@/lib/types/liveboard";

export function buildResponse<T>(params: {
  source: string;
  data: T | null;
  health: HealthState;
  ok: boolean;
  message?: string;
  requiresConfig?: boolean;
}): SourceResponse<T> {
  return {
    source: params.source,
    data: params.data,
    health: params.health,
    ok: params.ok,
    message: params.message,
    requiresConfig: params.requiresConfig,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
  }

  return (await response.json()) as T;
}

export function isConfigMissing(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}
