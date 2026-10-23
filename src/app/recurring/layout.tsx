import { ProtectedLayout } from "@/app/_components/ProtectedLayout";

export default function RecurringLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}

