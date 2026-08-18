import { NextResponse } from "next/server"

/* Which rows are already hidden on the Mac, so the page can mark them at once.

   Nothing can tell the browser that Yes was tapped in Telegram — there is no
   channel from a chat to a page. The published catalogue only catches up on the
   next 5-minute cycle, so an approved row sat there looking untouched and the
   approval felt like it had not worked. The page cannot be told, so it asks.

   Returns an empty list rather than an error when unreachable or unconfigured: a
   failure here must degrade to "mark nothing", never to a page that cannot render
   its table. The table itself comes from the published file and does not depend
   on this at all. */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const url = process.env.GEKKO_WEBHOOK_URL
  const secret = process.env.GEKKO_WEBHOOK_SECRET
  if (!url || !secret) return NextResponse.json({ hidden: [] }, { headers: { "Cache-Control": "no-store" } })
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/pine/hidden`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    })
    if (!r.ok) return NextResponse.json({ hidden: [] }, { headers: { "Cache-Control": "no-store" } })
    const j = await r.json()
    return NextResponse.json({ hidden: Array.isArray(j?.hidden) ? j.hidden : [] },
                             { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ hidden: [] }, { headers: { "Cache-Control": "no-store" } })
  }
}
