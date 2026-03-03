import { NextRequest, NextResponse } from "next/server";

import { getDisruptions } from "@/lib/providers/disruptions";

export const revalidate = 120;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const stationKey = request.nextUrl.searchParams.get("stationKey") ?? undefined;
  const data = await getDisruptions(stationKey);
  const statusCode = data.ok ? 200 : data.requiresConfig ? 503 : 502;

  return NextResponse.json(data, { status: statusCode });
}
