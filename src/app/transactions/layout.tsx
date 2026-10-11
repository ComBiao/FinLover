import { ProtectedLayout } from "@/app/_components/ProtectedLayout";

/**
 * Layout for the transactions section: renders the navigation sidebar
 * alongside the page content, offset to clear the sidebar's collapsed
 * (icon-only) width so the fixed, overlaying sidebar never causes a shift.
 */
export default function TransactionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
