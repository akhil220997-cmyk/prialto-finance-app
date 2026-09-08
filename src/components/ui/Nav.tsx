'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import clsx from 'clsx';

const LINKS = [
  { href: '/dashboard/revenue', label: 'Revenue & Unit Economics' },
  { href: '/dashboard/utilization', label: 'Utilization & Delivery Cost' },
  { href: '/dashboard/financials', label: 'Core Financials' },
  { href: '/dashboard/capacity', label: 'Capacity & Staffing' },
  { href: '/dashboard/churn', label: 'Churn' },
  { href: '/dashboard/variance', label: 'Variance (MoM)' },
  { href: '/dashboard/data-health', label: 'Data Health' },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface-1)]">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <span className="text-sm font-semibold tracking-tight text-[var(--brand-strong)]">Prialto Finance</span>
        <nav className="flex flex-1 flex-wrap gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                pathname?.startsWith(link.href)
                  ? 'bg-[var(--brand)]/15 text-[var(--brand-strong)]'
                  : 'text-[var(--text-secondary)] hover:bg-white/5',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {session?.user && (
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span>{session.user.email}</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
