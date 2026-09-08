import { AppProviders } from '@/components/providers/AppProviders';
import { Nav } from '@/components/ui/Nav';

const ssoConfigured = Boolean(process.env.GOOGLE_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      {!ssoConfigured && (
        <div className="bg-[var(--status-warning)]/15 px-6 py-2 text-center text-xs font-medium text-[var(--status-warning-text)]">
          Preview mode — SSO isn&apos;t configured yet, so this URL is open to anyone who has it. Add
          Google/Microsoft OAuth credentials to lock it down before sharing real data.
        </div>
      )}
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </AppProviders>
  );
}
