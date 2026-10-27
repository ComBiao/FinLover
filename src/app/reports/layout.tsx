import { ProtectedLayout } from "@/app/_components/ProtectedLayout";

/** Layout for the reports section: the private sidebar shell shared by every signed-in page. */
export default function ReportsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
