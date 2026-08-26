import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { OrgProfileEditor } from "@/components/org-profile-editor";

export default async function OrgProfilePage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "donor" && session.user.role !== "receiver")) {
    redirect("/dashboard");
  }
  if (!session.user.orgId) redirect("/onboarding");

  const [org] = await db
    .select({ name: organizations.name, about: organizations.about, photoUrl: organizations.photoUrl })
    .from(organizations)
    .where(eq(organizations.id, session.user.orgId))
    .limit(1);

  if (!org) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="animate-in fade-in slide-in-from-bottom-2 text-2xl font-semibold duration-500">
        {org.name}
      </h1>
      <p className="mt-1 text-muted-foreground">
        This photo and description appear on the public{" "}
        <a href="/network" className="underline underline-offset-4">
          network page
        </a>
        .
      </p>
      <div
        className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: "100ms" }}
      >
        <OrgProfileEditor initial={{ about: org.about ?? "", photoUrl: org.photoUrl }} />
      </div>
    </div>
  );
}
