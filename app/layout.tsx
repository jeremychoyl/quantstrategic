import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "QuantStrategic",
  description: "Live command center — ORB + EMA MNQ strategies",
  applicationName: "QuantStrategic",
  appleWebApp: {
    // iOS has no manifest support worth relying on — these three are what make
    // "Add to Home Screen" open chrome-free with the right status bar.
    capable: true,
    title: "QuantStrategic",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "QuantStrategic",
    description: "Systematic MNQ futures — live performance dashboard",
    images: ["/og.png"],
  },
}

// `viewportFit: "cover"` lets the page paint under the notch/home indicator;
// globals.css then pays that back with env(safe-area-inset-*) padding. Without
// the cover the standalone PWA gets letterboxed bars in the --bg colour.
// `maximumScale` is deliberately left unset: pinch-zoom is an accessibility
// feature and a wide table is exactly when someone wants it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0f",
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
