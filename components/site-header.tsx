"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const ROLE_HOME: Record<string, string> = {
  donor: "/donor",
  receiver: "/receiver",
  volunteer: "/volunteer",
  admin: "/admin",
};

export function SiteHeader() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          RescuePlate
        </Link>
        <nav className="flex items-center gap-3">
          {status === "authenticated" && session.user ? (
            <>
              <Link
                href={
                  session.user.role
                    ? ROLE_HOME[session.user.role] ?? "/"
                    : "/onboarding"
                }
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : status === "loading" ? null : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
