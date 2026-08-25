import { Card, CardContent } from "@/components/ui/card";

export function VerificationBanner({
  status,
}: {
  status: "pending" | "rejected";
}) {
  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <CardContent className="text-sm">
        {status === "pending"
          ? "Your organization is awaiting admin verification. You'll be able to use RescuePlate once it's approved."
          : "Your organization's verification was rejected. Contact support or update your details."}
      </CardContent>
    </Card>
  );
}
