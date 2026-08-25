import { requireRole } from "@/lib/auth-helpers";

export default async function AdminDashboard() {
  const session = await requireRole("admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome back, {session.user.name}</p>
      <div className="mt-6 rounded-md border border-dashed p-8 text-center text-muted-foreground">
        Organization verification queue will appear here in the next build step.
      </div>
    </div>
  );
}
