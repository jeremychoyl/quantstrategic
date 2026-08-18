import { NextResponse } from "next/server"

// The Pine-script catalogue, generated on the Mac mini by src/pine_inventory.py and
// published alongside tradingview.json.
//
// Unlike the notes, this has NO compiled-in fallback — it is generated from the two
// script repos, so a stale hardcoded copy would be worse than none. Absence returns
// published:false and the tab shows a quiet "not published yet" state.
const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/pine_catalogue.json"

/* ⚠️ no-store, NOT revalidate. `next: { revalidate: N }` is stale-while-revalidate:
   it serves the OLD copy and refreshes behind the scenes, so the page was adding up
   to another 5 minutes on top of the 5-minute publish cycle — a row removed a
   minute ago could sit there for ten. That is what made the catalogue feel broken
   after an approval. The upstream file changes at most every 5 minutes anyway, so
   fetching it fresh costs one small request. */
export const revalidate = 0
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" })
    if (res.status === 404) {
      return NextResponse.json({ published: false })
    }
    if (!res.ok) {
      return NextResponse.json({ published: false, error: "upstream failed" })
    }
    const data = await res.json()
    return NextResponse.json({ published: true, data },
                             { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    return NextResponse.json({ published: false, error: String(e) })
  }
}
