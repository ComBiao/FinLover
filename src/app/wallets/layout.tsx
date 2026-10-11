import { ProtectedLayout } from "@/app/_components/ProtectedLayout";

export default function WalletsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
