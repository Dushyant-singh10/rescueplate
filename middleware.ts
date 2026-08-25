import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { UserRole } from "@/types/next-auth";

const ROLE_PREFIXES: Record<string, UserRole> = {
  "/donor": "donor",
  "/receiver": "receiver",
  "/volunteer": "volunteer",
  "/admin": "admin",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!matchedPrefix) return NextResponse.next();

  const requiredRole = ROLE_PREFIXES[matchedPrefix];
  const user = req.auth?.user;

  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!user.role) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  if (user.role !== requiredRole) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/donor/:path*", "/receiver/:path*", "/volunteer/:path*", "/admin/:path*"],
};
