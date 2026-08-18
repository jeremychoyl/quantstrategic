import { NextResponse } from "next/server"

/* Relay a DELETE REQUEST from the catalogue to the Mac, which asks the owner to
   approve it in Telegram.

   ⛔ THIS ROUTE CANNOT DELETE ANYTHING. It forwards a request and nothing more.
   Approval happens on an authenticated channel the browser has no access to, so
   a page with no login never holds the authority to act — pressing the button is
   not consent, tapping Yes in Telegram is.

   The shared secret lives ONLY in the Vercel environment and is never sent to the
   browser, which is the reason this route exists at all rather than the page
   calling the Mac directly. */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const url = process.env.GEKKO_WEBHOOK_URL
  const secret = process.env.GEKKO_WEBHOOK_SECRET
  if (!url || !secret) {
    /* Name WHICH variable is absent. The first version said "one of these two is
       missing", which turned a 10-second fix into a guess — and the guess was
       wrong, costing a whole deploy cycle. Variable NAMES are not secret; their
       values are, and those are never read here beyond a presence check. */
    const missing = [!url && "GEKKO_WEBHOOK_URL", !secret && "GEKKO_WEBHOOK_SECRET"]
      .filter(Boolean).join(" and ")
    return NextResponse.json(
      { ok: false, error: `not configured — ${missing} not visible to this deployment`,
        hint: "set it for the Production environment, then redeploy" },
      { status: 503 },
    )
  }

  let script = ""
  try {
    script = String((await req.json())?.script ?? "").trim()
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 })
  }
  if (!script || script.length > 120) {
    return NextResponse.json({ ok: false, error: "script required" }, { status: 400 })
  }

  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/pine/delete-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, script }),
      signal: AbortSignal.timeout(12_000),
    })
    const body = await r.json().catch(() => ({}))
    if (r.status === 429) {
      return NextResponse.json({ ok: false, error: "too many requests just now — try again shortly" }, { status: 429 })
    }
    if (!r.ok) {
      // Never surface the upstream detail verbatim: it is written for the owner,
      // and this response is readable by anyone.
      return NextResponse.json({ ok: false, error: r.status === 404 ? "no such script" : "could not reach the approver" },
                               { status: r.status === 404 ? 404 : 502 })
    }
    return NextResponse.json({ ok: true, asked: body?.asked ?? script })
  } catch {
    return NextResponse.json({ ok: false, error: "could not reach the approver" }, { status: 502 })
  }
}
