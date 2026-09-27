"use client"

import { Sidebar } from "./sidebar"

export function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background"
    >
      <Sidebar />

      <main className="min-h-screen lg:mr-64">
        {children}
      </main>
    </div>
  )
}
