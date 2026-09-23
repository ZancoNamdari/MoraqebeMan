import { MainLayout } from "@/components/layout/mainlayout"

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
