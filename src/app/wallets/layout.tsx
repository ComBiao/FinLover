import { Sidebar } from "@/components/Sidebar";

export default function WalletsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-[#f8f8f6] pl-16">{children}</div>
    </>
  );
}

