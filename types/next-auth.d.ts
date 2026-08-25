import type { DefaultSession } from "next-auth";

export type UserRole = "donor" | "receiver" | "volunteer" | "admin";

declare module "next-auth" {
  interface User {
    role: UserRole | null;
    orgId: string | null;
    orgVerified: boolean;
  }

  interface Session {
    user: {
      role: UserRole | null;
      orgId: string | null;
      orgVerified: boolean;
    } & DefaultSession["user"];
  }
}
