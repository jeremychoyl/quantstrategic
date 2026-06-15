import { NextResponse } from "next/server"

const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/dashboard.json"

export const revalidate = 60

export async function GET() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json({ error: "upstream failed" }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
