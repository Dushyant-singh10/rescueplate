import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { loginSchema } from "@/lib/validations/auth";
import type { UserRole } from "@/types/next-auth";

type AppTokenFields = {
  role: UserRole | null;
  orgId: string | null;
  orgVerified: boolean;
};

async function isOrgVerified(orgId: string) {
  const [org] = await db
    .select({ verificationStatus: organizations.verificationStatus })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org?.verificationStatus === "verified";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (rawCredentials) => {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        if (!user || !user.passwordHash) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        const orgVerified = user.orgId ? await isOrgVerified(user.orgId) : false;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.photoUrl,
          role: user.role,
          orgId: user.orgId,
          orgVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      const t = token as typeof token & AppTokenFields;

      if (user && account?.provider === "credentials") {
        t.sub = user.id;
        t.role = user.role;
        t.orgId = user.orgId;
        t.orgVerified = user.orgVerified;
        return t;
      }

      if (user && account && account.provider !== "credentials") {
        const email = user.email?.toLowerCase();
        if (email) {
          const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (dbUser) {
            t.sub = dbUser.id;
            t.role = dbUser.role;
            t.orgId = dbUser.orgId;
            t.orgVerified = dbUser.orgId ? await isOrgVerified(dbUser.orgId) : false;
            t.picture = dbUser.photoUrl ?? user.image;
          } else {
            t.role = null;
            t.orgId = null;
            t.orgVerified = false;
            t.email = email;
            t.name = user.name ?? t.name;
          }
        }
        return t;
      }

      if (trigger === "update" && t.email) {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, t.email.toLowerCase()))
          .limit(1);
        if (dbUser) {
          t.sub = dbUser.id;
          t.role = dbUser.role;
          t.orgId = dbUser.orgId;
          t.orgVerified = dbUser.orgId ? await isOrgVerified(dbUser.orgId) : false;
          t.picture = dbUser.photoUrl;
          t.name = dbUser.name;
        }
      }

      return t;
    },
    session({ session, token }) {
      const t = token as typeof token & AppTokenFields;
      session.user.id = t.sub!;
      session.user.role = t.role;
      session.user.orgId = t.orgId;
      session.user.orgVerified = t.orgVerified;
      session.user.image = t.picture;
      return session;
    },
  },
});
