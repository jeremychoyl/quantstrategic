// Colorize explicitly-signed numbers inside an arbitrary string: +tokens green,
// −tokens red, everything else (bare counts like "7/40", "PF 1.0", "n=1") left
// as-is. Tokenizes on whitespace so hyphenated words ("flat-3ct") never trip it.
// Uses the theme --up/--down vars so it matches the rest of the dashboard.
export default function ColorNums({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((tok, i) => {
        const m = tok.match(/^([+-])\$?[\d,]+(?:\.\d+)?$/)
        if (!m) return <span key={i}>{tok}</span>
        return (
          <span key={i} style={{ color: m[1] === "-" ? "var(--down)" : "var(--up)", fontWeight: 600 }}>
            {tok}
          </span>
        )
      })}
    </>
  )
}
