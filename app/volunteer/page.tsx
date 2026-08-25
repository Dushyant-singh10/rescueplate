import { requireRole } from "@/lib/auth-helpers";

export default async function VolunteerDashboard() {
  const session = await requireRole("volunteer");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Volunteer dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome back, {session.user.name}</p>
      <div className="mt-6 rounded-md border border-dashed p-8 text-center text-muted-foreground">
        Pickup assignments will appear here in a later build step.
      </div>
    </div>
  );
}
