import type { ReactNode } from "react"

export default function AppMainSurface({ children }: { children: ReactNode }) {
  return <main className="workspace">{children}</main>
}
