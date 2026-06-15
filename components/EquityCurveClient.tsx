"use client"
import dynamic from "next/dynamic"
import { EquityPoint } from "@/lib/types"

const EquityCurve = dynamic(() => import("./EquityCurve"), { ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center text-sm animate-pulse" style={{ color: "var(--muted)" }}>Loading chart…</div>
})

export default function EquityCurveClient({ data }: { data: EquityPoint[] }) {
  return <EquityCurve data={data} />
}
