import { NextResponse } from "next/server"

// TradingView feed outages, measured on the Mac mini by src/tv_outages.py against
// the live bar archive and cross-referenced with the deployed ORB backtest.
//
// No compiled-in fallback: this is a live measurement, and a hardcoded copy would
// keep asserting an outage count long after it stopped being true.
const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/tv_outages.json"

export const revalidate = 300

export async function GET() {
  try {
    const res = await fetch(DATA_URL, { next: { revalidate: 300 } })
    if (res.status === 404) return NextResponse.json({ published: false })
    if (!res.ok) return NextResponse.json({ published: false, error: "upstream failed" })
    return NextResponse.json({ published: true, data: await res.json() })
  } catch (e) {
    return NextResponse.json({ published: false, error: String(e) })
  }
}
