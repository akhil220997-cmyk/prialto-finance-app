// Time Doctor connector — Time Doctor 2 API.
// Docs: https://api2.timedoctor.com/ , https://support.timedoctor.com/knowledge/how-to-use-the-time-doctor-api
//
// This is the source of truth for hours actually delivered per assistant/client,
// which is what the utilization dashboard compares against hours sold (Unit.hoursIncluded).

import { prisma } from '@/lib/db';

const TD_BASE = 'https://api2.timedoctor.com/api/1.0';

async function getAccessToken(): Promise<{ accessToken: string; companyId: string }> {
  const cred = await prisma.integrationCredential.findUnique({ where: { source: 'timedoctor' } });
  if (!cred || !cred.instanceUrl) {
    throw new Error('Time Doctor is not connected yet — complete setup first (see docs/CREDENTIALS.md).');
  }

  if (cred.expiresAt && cred.expiresAt.getTime() > Date.now() + 60_000) {
    return { accessToken: cred.accessToken, companyId: cred.instanceUrl };
  }

  if (!cred.refreshToken) {
    // Some Time Doctor plans issue a long-lived personal API token instead of OAuth —
    // in that case accessToken is used as-is and never rotated here.
    return { accessToken: cred.accessToken, companyId: cred.instanceUrl };
  }

  const res = await fetch(`${TD_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: cred.refreshToken,
      client_id: process.env.TIMEDOCTOR_CLIENT_ID,
      client_secret: process.env.TIMEDOCTOR_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Time Doctor token refresh failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };

  await prisma.integrationCredential.update({
    where: { source: 'timedoctor' },
    data: { accessToken: json.access_token, expiresAt: new Date(Date.now() + json.expires_in * 1000) },
  });

  return { accessToken: json.access_token, companyId: cred.instanceUrl };
}

export interface TimeDoctorWorklog {
  userId: string;
  userEmail: string;
  projectName: string; // mapped to a Prialto client via a project<->client lookup table
  date: string; // ISO date
  time: number; // seconds tracked
}

/** Daily worklogs for a date range — aggregated into TimeEntry rows by the sync job. */
export async function fetchWorklogs(companyId: string, from: string, to: string): Promise<TimeDoctorWorklog[]> {
  const { accessToken } = await getAccessToken();
  const url = `${TD_BASE}/activity/worklog?company=${companyId}&from=${from}&to=${to}&task-project-names=true`;
  const res = await fetch(url, { headers: { Authorization: `JWT ${accessToken}` } });
  if (!res.ok) throw new Error(`Time Doctor worklog fetch failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}

export interface TimeDoctorUser {
  id: string;
  email: string;
  name: string;
  // Custom "silo"/tag on the Time Doctor side used to mark delivery center
  // (GT/PH/KE) — falls back to unmapped if not tagged.
  tag?: string;
}

export async function fetchUsers(companyId: string): Promise<TimeDoctorUser[]> {
  const { accessToken } = await getAccessToken();
  const res = await fetch(`${TD_BASE}/users?company=${companyId}`, {
    headers: { Authorization: `JWT ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Time Doctor users fetch failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}
