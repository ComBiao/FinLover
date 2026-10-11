import RegisterPage from "@/features/auth/components/RegisterPage";
import { getSessionUser } from "@/server/shared/auth/session";
import { redirect } from "next/navigation";

export default async function Page() {
  if (await getSessionUser()) redirect("/homepage");
  return <RegisterPage />;
}
