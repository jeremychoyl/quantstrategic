import { NextResponse } from "next/server"

// Bar-feed status, measured on the Mac mini against the live webhook file.
//
// ⚠️ no-store, NOT revalidate. This first shipped with `next: { revalidate: 60 }`,
// which is stale-while-revalidate: it happily serves an old payload while it
// refreshes in the background. Measured 2026-08-16, it served one 23 MINUTES old
// while the publisher was running normally three minutes prior — and the page,
// which ages the timestamp itself, added that lag to the bar age and showed a false
// NO BARS on a perfectly healthy feed.
//
// /api/dashboard already had the right shape for a live payload; this now matches it.
const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/feed_status.json"

export async function GET() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" })
    if (res.status === 404) return NextResponse.json({ published: false })
    if (!res.ok) return NextResponse.json({ published: false, error: "upstream failed" })
    return NextResponse.json(
      { published: true, data: await res.json() },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (e) {
    return NextResponse.json({ published: false, error: String(e) })
  }
}
