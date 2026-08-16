import { NextResponse } from "next/server"

// Optional live override for the TradingView tab.
//
// The tab always renders from lib/tvNotes.ts. If this file exists in the
// quantstrategic-data repo it REPLACES that content, which lets the Windows PC
// publish an update by pushing one JSON file — no rebuild, no redeploy.
//
// Absence is the normal state, not an error: a 404 here means "nothing
// published yet, use the baked-in copy", so it returns 200 with published:false
// rather than a 502 the page would have to treat as a failure.
const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/tradingview.json"

export const revalidate = 300

export async function GET() {
  try {
    const res = await fetch(DATA_URL, { next: { revalidate: 300 } })
    if (res.status === 404) {
      return NextResponse.json({ published: false })
    }
    if (!res.ok) {
      return NextResponse.json({ published: false, error: "upstream failed" })
    }
    const data = await res.json()
    return NextResponse.json({ published: true, data })
  } catch (e) {
    return NextResponse.json({ published: false, error: String(e) })
  }
}
