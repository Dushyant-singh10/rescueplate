"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { MoonIcon, SunIcon, MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_HOME: Record<string, string> = {
  donor: "/donor",
  receiver: "/receiver",
  volunteer: "/volunteer",
  admin: "/admin",
};

const emptySubscribe = () => () => {};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Hydration-safe "did we reach the client" check without setState-in-effect.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="overflow-hidden"
    >
      {mounted && resolvedTheme === "dark" ? (
        <SunIcon className="animate-in zoom-in-50 spin-in-45 duration-300" />
      ) : (
        <MoonIcon className="animate-in zoom-in-50 spin-in-45 duration-300" />
      )}
    </Button>
  );
}

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary transition-all duration-200 group-hover:w-full" />
    </Link>
  );
}

export function SiteHeader() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const isAuthed = status === "authenticated" && session.user;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight transition-colors hover:text-primary"
        >
          RescuePlate
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 sm:flex">
          <NavLink href="/network">Our network</NavLink>
          <ThemeToggle />
          {isAuthed ? (
            <>
              <NavLink
                href={session.user.role ? ROLE_HOME[session.user.role] ?? "/" : "/onboarding"}
              >
                Dashboard
              </NavLink>
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                    {session.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="text-sm text-muted-foreground">{session.user.name}</span>
              </Link>
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

        {/* Mobile controls */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </Button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen ? (
        <nav className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-1 border-t px-4 py-3 duration-200 sm:hidden">
          <NavLink href="/network" onClick={closeMenu}>
            Our network
          </NavLink>
          {isAuthed ? (
            <>
              <NavLink
                href={session.user.role ? ROLE_HOME[session.user.role] ?? "/" : "/onboarding"}
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>
              <Link
                href="/profile"
                onClick={closeMenu}
                className="flex items-center gap-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                    {session.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                {session.user.name} — profile
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-fit"
                onClick={() => signOut()}
              >
                Sign out
              </Button>
            </>
          ) : (
            <div className="mt-2 flex gap-2">
              <Link href="/login" onClick={closeMenu}>
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register" onClick={closeMenu}>
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </nav>
      ) : null}
    </header>
  );
}
