import { NextResponse } from "next/server"

// Bar-feed status, measured on the Mac mini against the live webhook file.
//
// revalidate is 60, not 300 like the others: this is the one payload whose whole
// purpose is freshness. The page still ages the timestamp itself, so a stale fetch
// degrades to "last bar 47 min ago" rather than to a false green — but there is no
// reason to make it wait five minutes to notice.
const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/feed_status.json"

export const revalidate = 60

export async function GET() {
  try {
    const res = await fetch(DATA_URL, { next: { revalidate: 60 } })
    if (res.status === 404) return NextResponse.json({ published: false })
    if (!res.ok) return NextResponse.json({ published: false, error: "upstream failed" })
    return NextResponse.json({ published: true, data: await res.json() })
  } catch (e) {
    return NextResponse.json({ published: false, error: String(e) })
  }
}
