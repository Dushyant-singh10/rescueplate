"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type OrgRow = {
  id: string;
  name: string;
  type: "donor_business" | "receiver_ngo";
  address: string;
  verificationStatus: "pending" | "verified" | "rejected";
  createdAt: string;
};

const STATUS_VARIANT: Record<OrgRow["verificationStatus"], "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  verified: "default",
  rejected: "destructive",
};

export function OrgVerificationTable({ initialOrgs }: { initialOrgs: OrgRow[] }) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(orgId: string, action: "approve" | "reject") {
    setPendingId(orgId);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orgs/${orgId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        toast.error("Something went wrong updating that organization");
        setPendingId(null);
        return;
      }

      const { status } = await res.json();
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, verificationStatus: status } : o))
      );
      toast.success(status === "verified" ? "Organization verified" : "Organization rejected");
      setPendingId(null);
    });
  }

  if (orgs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No organizations yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Organization</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orgs.map((org) => (
          <TableRow key={org.id}>
            <TableCell className="font-medium">{org.name}</TableCell>
            <TableCell>
              {org.type === "donor_business" ? "Donor" : "Receiver"}
            </TableCell>
            <TableCell className="max-w-xs truncate">{org.address}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[org.verificationStatus]}>
                {org.verificationStatus}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {org.verificationStatus === "pending" ? (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    disabled={isPending && pendingId === org.id}
                    onClick={() => handleAction(org.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && pendingId === org.id}
                    onClick={() => handleAction(org.id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {org.verificationStatus === "verified" ? "Verified" : "Rejected"}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
