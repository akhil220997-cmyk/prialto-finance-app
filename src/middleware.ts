import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Gate every page except the login screen and NextAuth's own routes behind SSO
// — UNLESS no SSO provider is configured yet (no GOOGLE_CLIENT_ID /
// AZURE_AD_CLIENT_ID env vars set). In that case there is nothing to log into,
// so gating would just be a dead-end login page with non-functional buttons;
// instead we allow open access so the app is reviewable on demo data before
// real SSO credentials exist. The moment either provider is configured, this
// reverts to a hard login requirement automatically — no code change needed.
const ssoConfigured = Boolean(process.env.GOOGLE_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID);

export default ssoConfigured
  ? withAuth({ pages: { signIn: '/login' } })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
