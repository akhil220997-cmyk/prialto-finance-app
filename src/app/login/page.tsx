'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-plane)]">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Prialto Finance</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Internal tool — sign in with your Prialto account.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard/revenue' })}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-white/5"
          >
            Continue with Google
          </button>
          <button
            onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard/revenue' })}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-white/5"
          >
            Continue with Microsoft
          </button>
        </div>
        <p className="mt-6 text-xs text-[var(--text-muted)]">
          Access is limited to @prialto.com accounts and requires an internal role
          assignment. Contact finance ops if you need access.
        </p>
      </div>
    </div>
  );
}
