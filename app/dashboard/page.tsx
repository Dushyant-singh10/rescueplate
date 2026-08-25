import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ROLE_HOME: Record<string, string> = {
  donor: "/donor",
  receiver: "/receiver",
  volunteer: "/volunteer",
  admin: "/admin",
};

export default async function DashboardRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.role) redirect("/onboarding");
  redirect(ROLE_HOME[session.user.role] ?? "/");
}
