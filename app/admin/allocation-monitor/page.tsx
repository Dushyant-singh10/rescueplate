import { requireRole } from "@/lib/auth-helpers";
import { AllocationMonitor } from "@/components/admin/allocation-monitor";

export default async function AllocationMonitorPage() {
  await requireRole("admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Allocation monitor</h1>
      <p className="mt-1 text-muted-foreground">
        Live view of listings currently being ranked and offered — refreshes every 5 seconds.
      </p>
      <div className="mt-6">
        <AllocationMonitor />
      </div>
    </div>
  );
}
