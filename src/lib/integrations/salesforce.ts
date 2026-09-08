// Salesforce connector — REST API (documented, versioned endpoints only).
// Docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
//
// Auth: standard OAuth 2.0 web-server flow via a Connected App (see
// docs/CREDENTIALS.md #1). This module assumes a valid refresh token already
// exists in IntegrationCredential (written once by the admin OAuth consent flow
// in the /api/auth callback) and handles refreshing the short-lived access token.

import { prisma } from '@/lib/db';

const API_VERSION = 'v60.0';

interface SalesforceOpportunityRecord {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  IsWon: boolean;
  IsClosed: boolean;
  AccountId: string;
  Account?: { Name: string };
  // Custom fields — create these on the Opportunity object if they don't exist yet.
  Prialto_Units__c?: number | null;
  Service_Tier__c?: string | null;
}

async function getAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  const cred = await prisma.integrationCredential.findUnique({ where: { source: 'salesforce' } });
  if (!cred || !cred.refreshToken || !cred.instanceUrl) {
    throw new Error('Salesforce is not connected yet — complete the OAuth flow first (see docs/CREDENTIALS.md).');
  }

  if (cred.expiresAt && cred.expiresAt.getTime() > Date.now() + 60_000) {
    return { accessToken: cred.accessToken, instanceUrl: cred.instanceUrl };
  }

  const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
      refresh_token: cred.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Salesforce token refresh failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; instance_url: string };

  await prisma.integrationCredential.update({
    where: { source: 'salesforce' },
    data: { accessToken: json.access_token, instanceUrl: json.instance_url, expiresAt: new Date(Date.now() + 15 * 60_000) },
  });

  return { accessToken: json.access_token, instanceUrl: json.instance_url };
}

async function soqlQuery<T>(soql: string): Promise<T[]> {
  const { accessToken, instanceUrl } = await getAccessToken();
  const records: T[] = [];
  let url: string | null =
    `${instanceUrl}/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`;

  while (url) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Salesforce query failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { records: T[]; nextRecordsUrl?: string; done: boolean };
    records.push(...json.records);
    url = json.done ? null : `${instanceUrl}${json.nextRecordsUrl}`;
  }
  return records;
}

/** Pulls all Opportunities updated in the last `sinceDays` days, for incremental sync. */
export async function fetchOpportunities(sinceDays = 1): Promise<SalesforceOpportunityRecord[]> {
  const soql = `
    SELECT Id, Name, StageName, Amount, CloseDate, IsWon, IsClosed, AccountId, Account.Name,
           Prialto_Units__c, Service_Tier__c
    FROM Opportunity
    WHERE LastModifiedDate = LAST_N_DAYS:${sinceDays}
    ORDER BY LastModifiedDate DESC
  `.trim();
  return soqlQuery<SalesforceOpportunityRecord>(soql);
}

export async function fetchAccounts(sinceDays = 1) {
  const soql = `
    SELECT Id, Name, Industry, BillingCountry, Owner.Name
    FROM Account
    WHERE LastModifiedDate = LAST_N_DAYS:${sinceDays}
  `.trim();
  return soqlQuery(soql);
}
