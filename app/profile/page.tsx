import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { ProfileEditor } from "@/components/profile-editor";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      bio: users.bio,
      photoUrl: users.photoUrl,
      role: users.role,
      orgName: organizations.name,
    })
    .from(users)
    .leftJoin(organizations, eq(users.orgId, organizations.id))
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="animate-in fade-in slide-in-from-bottom-2 text-2xl font-semibold duration-500">
        Your profile
      </h1>
      <p className="mt-1 text-muted-foreground">
        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "No role yet"}
        {user.orgName ? ` · ${user.orgName}` : ""}
      </p>
      <div
        className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: "100ms" }}
      >
        <ProfileEditor
          initial={{
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
            bio: user.bio ?? "",
            photoUrl: user.photoUrl,
          }}
        />
      </div>
    </div>
  );
}
