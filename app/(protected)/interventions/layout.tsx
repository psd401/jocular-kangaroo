import { NavbarNested } from "@/components/navigation/navbar-nested"

export default function InterventionsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen pt-14">
      <NavbarNested />
      <main className="flex-1 lg:pl-[68px]">
        <div className="bg-white">
          {children}
        </div>
      </main>
    </div>
  )
}