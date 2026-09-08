// Orchestrates a full sync across all three sources (Salesforce, QuickBooks,
// Time Doctor). Safe to run even if only some sources have credentials
// configured yet — each source fails independently and is recorded in
// SyncRun rather than aborting the whole run.
//
// Run manually: npm run sync:all
// In production, schedule this (cron / a serverless scheduled function) —
// e.g. every 4 hours for Salesforce/QuickBooks, hourly for Time Doctor.

import { prisma } from '../src/lib/db';
import * as salesforce from '../src/lib/integrations/salesforce';
import * as quickbooks from '../src/lib/integrations/quickbooks';
import * as timedoctor from '../src/lib/integrations/timedoctor';

async function runSync(source: string, fn: () => Promise<number>) {
  const run = await prisma.syncRun.create({ data: { source, status: 'running' } });
  try {
    const recordsSynced = await fn();
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: 'success', recordsSynced, finishedAt: new Date() },
    });
    console.log(`[${source}] synced ${recordsSynced} records`);
  } catch (err) {
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: 'failed', errorMessage: String(err), finishedAt: new Date() },
    });
    console.error(`[${source}] sync failed:`, err);
  }
}

async function syncSalesforce() {
  const opportunities = await salesforce.fetchOpportunities(7);
  for (const opp of opportunities) {
    await prisma.opportunity.upsert({
      where: { salesforceId: opp.Id },
      create: {
        salesforceId: opp.Id,
        clientId: opp.AccountId, // NOTE: requires Client rows to be keyed by Salesforce Account Id already
        name: opp.Name,
        stage: opp.StageName,
        amount: opp.Amount ?? 0,
        units: opp.Prialto_Units__c ?? null,
        tier: opp.Service_Tier__c ?? null,
        isWon: opp.IsWon,
        isClosed: opp.IsClosed,
        closeDate: opp.CloseDate ? new Date(opp.CloseDate) : null,
      },
      update: {
        stage: opp.StageName,
        amount: opp.Amount ?? 0,
        isWon: opp.IsWon,
        isClosed: opp.IsClosed,
      },
    });
  }
  return opportunities.length;
}

async function syncQuickBooks() {
  const sinceIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const invoices = await quickbooks.fetchInvoices(sinceIso);
  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { quickbooksId: inv.Id },
      create: {
        quickbooksId: inv.Id,
        issueDate: new Date(inv.TxnDate),
        dueDate: new Date(inv.DueDate),
        amount: inv.TotalAmt,
        balance: inv.Balance,
        status: inv.Balance > 0 ? 'open' : 'paid',
        currency: inv.CurrencyRef?.value ?? 'USD',
      },
      update: { amount: inv.TotalAmt, balance: inv.Balance, status: inv.Balance > 0 ? 'open' : 'paid' },
    });
  }
  return invoices.length;
}

async function syncTimeDoctor() {
  const companyId = process.env.TIMEDOCTOR_COMPANY_ID;
  if (!companyId) throw new Error('TIMEDOCTOR_COMPANY_ID not set');
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const worklogs = await timedoctor.fetchWorklogs(companyId, from, to);
  for (const log of worklogs) {
    await prisma.timeEntry.upsert({
      where: { timedoctorId: `${log.userId}-${log.date}` },
      create: {
        timedoctorId: `${log.userId}-${log.date}`,
        assistantEmail: log.userEmail,
        date: new Date(log.date),
        hoursTracked: log.time / 3600,
        hoursBillable: log.time / 3600,
      },
      update: { hoursTracked: log.time / 3600, hoursBillable: log.time / 3600 },
    });
  }
  return worklogs.length;
}

async function main() {
  await runSync('salesforce', syncSalesforce);
  await runSync('quickbooks', syncQuickBooks);
  await runSync('timedoctor', syncTimeDoctor);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
