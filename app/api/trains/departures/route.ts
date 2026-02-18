import { NextRequest, NextResponse } from "next/server";

import { getTrainBoard } from "@/lib/providers/sncfClient";

export const revalidate = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const stationKey = request.nextUrl.searchParams.get("stationKey") ?? undefined;
  const data = await getTrainBoard({
    kind: "departures",
    stationKey,
    count: 20,
  });

  const statusCode = data.ok ? 200 : data.requiresConfig ? 503 : 502;

  return NextResponse.json(data, { status: statusCode });
}
