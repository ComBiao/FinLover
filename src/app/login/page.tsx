import LoginPage from "@/features/auth/components/LoginPage";
import { getSessionUser } from "@/server/shared/auth/session";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  if (await getSessionUser()) redirect("/homepage");
  const { registered } = await searchParams;
  return <LoginPage registrationSucceeded={registered === "1"} />;
}
