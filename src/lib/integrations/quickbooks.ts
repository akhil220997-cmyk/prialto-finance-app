// QuickBooks Online connector — Accounting API v3, documented entity endpoints
// only (Invoice, Bill, Payment, JournalEntry, Account). Deliberately avoids the
// legacy Reports API, which Intuit is retiring transaction-detail/list-style
// reports from on June 30, 2026 (see docs/CREDENTIALS.md #2).
// Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities

import { prisma } from '@/lib/db';

const QBO_BASE = process.env.QBO_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

async function getAccessToken(): Promise<{ accessToken: string; realmId: string }> {
  const cred = await prisma.integrationCredential.findUnique({ where: { source: 'quickbooks' } });
  if (!cred || !cred.refreshToken || !cred.instanceUrl) {
    throw new Error('QuickBooks is not connected yet — complete the OAuth flow first (see docs/CREDENTIALS.md).');
  }

  if (cred.expiresAt && cred.expiresAt.getTime() > Date.now() + 60_000) {
    return { accessToken: cred.accessToken, realmId: cred.instanceUrl };
  }

  const basicAuth = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: cred.refreshToken }),
  });
  if (!res.ok) throw new Error(`QuickBooks token refresh failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };

  await prisma.integrationCredential.update({
    where: { source: 'quickbooks' },
    data: {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: new Date(Date.now() + json.expires_in * 1000),
    },
  });

  return { accessToken: json.access_token, realmId: cred.instanceUrl };
}

async function qboQuery<T>(sql: string): Promise<T[]> {
  const { accessToken, realmId } = await getAccessToken();
  const res = await fetch(
    `${QBO_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(sql)}&minorversion=70`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(`QuickBooks query failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const entityKey = Object.keys(json.QueryResponse ?? {}).find((k) => k !== 'startPosition' && k !== 'maxResults');
  return entityKey ? (json.QueryResponse[entityKey] as T[]) : [];
}

export interface QboInvoice {
  Id: string;
  CustomerRef: { value: string; name: string };
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  CurrencyRef?: { value: string };
}

/** Invoices modified since a given ISO date — drives the Invoice + AR aging tables. */
export async function fetchInvoices(sinceIso: string): Promise<QboInvoice[]> {
  return qboQuery<QboInvoice>(
    `SELECT * FROM Invoice WHERE Metadata.LastUpdatedTime >= '${sinceIso}' MAXRESULTS 1000`,
  );
}

export interface QboJournalEntry {
  Id: string;
  TxnDate: string;
  Line: Array<{
    Amount: number;
    JournalEntryLineDetail: { PostingType: 'Debit' | 'Credit'; AccountRef: { value: string; name: string } };
  }>;
}

/** Journal entries — the general-ledger source for P&L / balance-sheet line items. */
export async function fetchJournalEntries(sinceIso: string): Promise<QboJournalEntry[]> {
  return qboQuery<QboJournalEntry>(
    `SELECT * FROM JournalEntry WHERE Metadata.LastUpdatedTime >= '${sinceIso}' MAXRESULTS 1000`,
  );
}

export async function fetchAccounts() {
  return qboQuery<{ Id: string; Name: string; AccountType: string; AccountSubType: string }>(
    'SELECT * FROM Account MAXRESULTS 1000',
  );
}
