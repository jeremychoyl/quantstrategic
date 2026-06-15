"use client"
import dynamic from "next/dynamic"
import { DayPnL } from "@/lib/types"

const PnLBar = dynamic(() => import("./PnLBar"), { ssr: false,
  loading: () => <div className="h-48 flex items-center justify-center text-sm animate-pulse" style={{ color: "var(--muted)" }}>Loading chart…</div>
})

export default function PnLBarClient({ data }: { data: DayPnL[] }) {
  return <PnLBar data={data} />
}
