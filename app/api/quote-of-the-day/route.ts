import { NextRequest, NextResponse } from "next/server";

import { getQuoteOfDay } from "@/lib/providers/quote";
import type { Locale } from "@/lib/types/liveboard";

export const revalidate = 120;

function normalizeLocale(value: string | null): Locale {
  return value === "en" ? "en" : "fr";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const lang = normalizeLocale(request.nextUrl.searchParams.get("lang"));
  const data = await getQuoteOfDay(lang);
  const statusCode = data.ok ? 200 : data.requiresConfig ? 503 : 502;

  return NextResponse.json(data, { status: statusCode });
}
