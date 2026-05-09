import { NextResponse } from "next/server";
import { fetchDDData } from "@/lib/birdeye";
import { generateVerdict } from "@/lib/verdict";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { mint } = (await req.json()) as { mint?: string };
    if (!mint || typeof mint !== "string") {
      return NextResponse.json({ error: "mint is required" }, { status: 400 });
    }

    const payload = await fetchDDData(mint);
    if (!payload.overview?.symbol) {
      return NextResponse.json({ error: "token not found on Birdeye" }, { status: 404 });
    }

    const verdict = await generateVerdict(payload);
    return NextResponse.json({ payload, verdict });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mint = url.searchParams.get("mint");
  if (!mint) return NextResponse.json({ error: "?mint= required" }, { status: 400 });
  const payload = await fetchDDData(mint);
  if (!payload.overview?.symbol) {
    return NextResponse.json({ error: "token not found" }, { status: 404 });
  }
  const verdict = await generateVerdict(payload);
  return NextResponse.json({ payload, verdict });
}
