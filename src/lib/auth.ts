import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { prisma } from '@/lib/db';

// Company SSO only (Google Workspace + Microsoft/Entra) — no password login, per
// the decision to keep this restricted to internal Prialto stakeholders. Restrict
// to the company domain via ALLOWED_EMAIL_DOMAIN so a personal Gmail/Outlook
// account can't sign in even if someone guesses the app URL.

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN; // e.g. "prialto.com"

export const authOptions: NextAuthOptions = {
  // NextAuth requires a signing secret in production even when no providers
  // are configured yet (it still stands up session/JWT handling). Falls
  // back to a fixed placeholder so the app doesn't 500 before real SSO is
  // wired up — this does NOT protect anything today since middleware.ts
  // only enforces auth once a provider is configured. Set a real
  // NEXTAUTH_SECRET on Vercel before enabling Google/Microsoft sign-in.
  secret: process.env.NEXTAUTH_SECRET || 'prialto-finance-preview-placeholder-secret-change-me',
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID,
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (ALLOWED_DOMAIN && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;

      await prisma.user.upsert({
        where: { email: user.email },
        create: { email: user.email, name: user.name ?? undefined, image: user.image ?? undefined },
        update: { name: user.name ?? undefined, image: user.image ?? undefined, lastLoginAt: new Date() },
      });
      return true;
    },
    async session({ session }) {
      if (!session.user?.email) return session;
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (dbUser) {
        session.user.role = dbUser.role;
        session.user.department = dbUser.department;
      }
      return session;
    },
  },
};
