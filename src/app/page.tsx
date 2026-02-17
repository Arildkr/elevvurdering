import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";

export default async function Home() {
  const user = await validateSession();

  if (user) {
    if (user.isAdmin) {
      redirect("/admin");
    }
    redirect("/dashboard");
  }

  redirect("/login");
}
