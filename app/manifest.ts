import type { MetadataRoute } from "next"

// Add-to-home-screen. `display: standalone` drops the browser chrome, which is
// the whole point on a phone — the nav bar is already sticky, so the URL bar was
// pure wasted height. Colours track globals.css (--bg / --accent); if those
// change, change these too or the splash screen flashes the wrong colour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuantStrategic",
    short_name: "QuantStrategic",
    description: "Systematic MNQ futures — live performance dashboard",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed variant: Android crops the icon to whatever mask the launcher
      // uses, so the "any" icon's transparent corners would get clipped into the
      // curve. This one keeps the mark inside the 80% safe zone.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
