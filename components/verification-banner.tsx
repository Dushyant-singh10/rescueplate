import { AlertCircleIcon, ClockIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function VerificationBanner({
  status,
}: {
  status: "pending" | "rejected";
}) {
  const isPending = status === "pending";
  return (
    <Card
      className={`animate-in fade-in slide-in-from-top-2 flex-row items-center gap-3 duration-500 ${
        isPending
          ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <CardContent className="flex items-center gap-3 text-sm">
        {isPending ? (
          <ClockIcon className="size-5 shrink-0 animate-pulse text-amber-600 dark:text-amber-400" />
        ) : (
          <AlertCircleIcon className="size-5 shrink-0 text-destructive" />
        )}
        <span>
          {isPending
            ? "Your organization is awaiting admin verification. You'll be able to use RescuePlate once it's approved."
            : "Your organization's verification was rejected. Contact support or update your details."}
        </span>
      </CardContent>
    </Card>
  );
}
