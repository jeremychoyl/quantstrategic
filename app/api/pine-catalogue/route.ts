import { NextResponse } from "next/server"

// The Pine-script catalogue, generated on the Mac mini by src/pine_inventory.py and
// published alongside tradingview.json.
//
// Unlike the notes, this has NO compiled-in fallback — it is generated from the two
// script repos, so a stale hardcoded copy would be worse than none. Absence returns
// published:false and the tab shows a quiet "not published yet" state.
const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/pine_catalogue.json"

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
