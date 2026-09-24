import { NextResponse } from "next/server";
import { fetchTollBreakdown } from "@/lib/tollBreakdown";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const encodedPolyline = body?.encodedPolyline;

  if (typeof encodedPolyline !== "string" || encodedPolyline.length === 0) {
    return NextResponse.json({ error: "encodedPolyline is required." }, { status: 400 });
  }

  const apiKey = process.env.TFNSW_TOLL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "unavailable", reason: "Toll breakdown is not configured yet." },
      { status: 200 },
    );
  }

  const breakdown = await fetchTollBreakdown(encodedPolyline, apiKey);
  return NextResponse.json(breakdown);
}
