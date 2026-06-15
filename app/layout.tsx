import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "QuantStrategic",
  description: "Live command center — ORB + EMA MNQ strategies",
  openGraph: {
    title: "QuantStrategic",
    description: "Systematic MNQ futures — live performance dashboard",
    images: ["/og.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {children}
      </body>
    </html>
  )
}
