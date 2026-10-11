import { redirect } from "next/navigation";

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
      <div className="min-h-screen bg-[#f8f8f6] md:pl-16">{children}</div>
    </>
  );
}
