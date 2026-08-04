import { NextResponse } from "next/server"

// Static crisis-analysis dataset (regenerated only when tmp/crisis_impact.py
// --export is re-run; NOT touched by the 5-min dashboard push).
const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/crisis.json"

export const revalidate = 3600

export async function GET() {
  try {
    const res = await fetch(DATA_URL, { next: { revalidate: 3600 } })
    if (!res.ok) {
      return NextResponse.json({ error: "upstream failed" }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
