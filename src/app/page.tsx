import { redirect } from "next/navigation";

/** The product entry point always starts at the login route. */
export default function Home() {
  redirect("/login");
}
