import { Sidebar } from "@/components/Sidebar";

/**
 * Layout for the dashboard section: renders the navigation sidebar
 * alongside the page content, offset to clear the sidebar's collapsed
 * (icon-only) width so the fixed, overlaying sidebar never causes a shift.
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-[#f8f8f6] md:pl-16">{children}</div>
    </>
  );
}
