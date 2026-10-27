import { redirect } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { getSessionUser } from "@/server/shared/auth/session";

/** Server-side boundary shared by every private page. */
export async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <Sidebar />
      {/* Phones: the fixed BottomNav replaces the Sidebar, so keep content clear of it. */}
      <div className="min-h-screen bg-[#f8f8f6] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-16">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
