"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: "donor" | "receiver" | "volunteer" | "admin" | null;
  orgName: string | null;
};

export function UserManagement({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ManagedUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(userId: string, action: "grant_admin" | "revoke_admin") {
    setPendingId(userId);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Could not update that user");
        setPendingId(null);
        return;
      }

      const { role } = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role, orgName: null } : u)));
      toast.success(action === "grant_admin" ? "Admin access granted" : "Admin access revoked");
      setPendingId(null);
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user, i) => (
          <TableRow
            key={user.id}
            className="animate-in fade-in slide-in-from-left-1 fill-mode-backwards duration-300"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === "admin" ? "default" : "outline"}>
                {user.role ?? "unassigned"}
              </Badge>
            </TableCell>
            <TableCell>{user.orgName ?? "—"}</TableCell>
            <TableCell className="text-right">
              {user.id === currentUserId ? (
                <span className="text-xs text-muted-foreground">You</span>
              ) : user.role === "admin" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && pendingId === user.id}
                  onClick={() => handleAction(user.id, "revoke_admin")}
                >
                  Revoke admin
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={isPending && pendingId === user.id}
                  onClick={() => handleAction(user.id, "grant_admin")}
                >
                  Make admin
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
