import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { checkRateLimit } from "./rate-limit";

const LOGIN_WINDOW_SECONDS = 10 * 60;
const LOGIN_IP_LIMIT = 20; // broad - catches a script hammering many accounts from one IP
const LOGIN_EMAIL_LIMIT = 8; // tighter - catches credential stuffing on one account from anywhere

function requestIp(req: { headers?: Record<string, unknown> } | undefined): string {
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();
  const realIp = req?.headers?.["x-real-ip"];
  if (typeof realIp === "string") return realIp.trim();
  return "unknown";
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const ip = requestIp(req);

        // Checked before touching the database for this attempt at all -
        // a brute-force script gets throttled without even costing a
        // password hash comparison once it's over the limit. Both checks
        // run every attempt (not short-circuited) so an attacker can't
        // learn which limit they haven't hit yet.
        const [ipLimit, emailLimit] = await Promise.all([
          checkRateLimit(`login:ip:${ip}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_SECONDS),
          checkRateLimit(`login:email:${normalizedEmail}`, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_SECONDS),
        ]);
        if (!ipLimit.allowed || !emailLimit.allowed) return null;

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user) return null;

        const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordValid) return null;

        // A suspended account can't start a new session, regardless of a
        // correct password - src/proxy.ts is the other half of this: it
        // blocks a session issued *before* a suspension from continuing to
        // be used.
        if (!user.isActive) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
