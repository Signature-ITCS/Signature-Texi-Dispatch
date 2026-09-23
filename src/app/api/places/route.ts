import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { serverMapsKey } from "@/lib/googleKey";

/** Address autocomplete via Google Places REST (server-side). */
export async function POST(req: Request) {
  if (!rateLimit(`places:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ predictions: [] }, { status: 429 });
  }
  const { input } = await req.json().catch(() => ({ input: "" }));
  if (!input || input.trim().length < 3) return NextResponse.json({ predictions: [] });

  // Restrict suggestions to the UK only (service area). `gb` = United Kingdom
  // (Great Britain + Northern Ireland). `region=gb` biases results too.
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    input
  )}&components=country:gb&region=gb&key=${serverMapsKey()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const predictions = (data.predictions ?? []).map((p: { description: string; place_id: string }) => ({
      description: p.description,
      place_id: p.place_id,
    }));
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
