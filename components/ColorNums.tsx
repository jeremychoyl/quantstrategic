// Colorize explicitly-signed numbers inside an arbitrary string: +tokens green,
// −tokens red, everything else (bare counts like "7/40", "PF 1.0", "n=1") left
// as-is. Tokenizes on whitespace so hyphenated words ("flat-3ct") never trip it.
// Uses the theme --up/--down vars so it matches the rest of the dashboard.
export default function ColorNums({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((tok, i) => {
        // +win  (loss)  −$1,234  ($662) — signed (ASCII/unicode −) OR accounting brackets
        const signed = tok.match(/^([+\-−])\$?[\d,]+(?:\.\d+)?$/)
        const bracket = /^\(\$?[\d,]+(?:\.\d+)?\)$/.test(tok)   // (662) / ($1,988) = loss
        if (!signed && !bracket) return <span key={i}>{tok}</span>
        const neg = bracket || signed![1] === "-" || signed![1] === "−"
        return (
          <span key={i} style={{ color: neg ? "var(--down)" : "var(--up)", fontWeight: 600 }}>
            {tok}
          </span>
        )
      })}
    </>
  )
}
