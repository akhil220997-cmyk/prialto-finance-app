// Seeds the local dev database with data shaped like a live sync would produce
// — useful for testing the USE_MOCK_DATA=false code path (lib/queries/*.ts)
// without needing real Salesforce/QuickBooks/Time Doctor credentials yet.
// Run: npm run db:seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TIERS = ['Fractional', 'Full-Time', 'Enterprise'] as const;
const REGIONS = ['GT', 'PH', 'KE'] as const;
const RATES: Record<(typeof TIERS)[number], number> = { Fractional: 1600, 'Full-Time': 1500, Enterprise: 1350 };

const CLIENT_NAMES = [
  'Meridian Capital Advisors', 'Northgate Realty Group', 'Bluewater Consulting',
  'Harborview Financial', 'Summit Peak Nonprofit', 'Cascade Tax & Accounting',
  'Ironwood Partners', 'Silverline Wealth Mgmt', 'Redwood Ventures', 'Pacific Rim Logistics',
  'Alder Street Law', 'Beacon Hill Insurance', 'Crestline Realty', 'Elm & Oak Advisory',
  'Foxglove Nonprofit Alliance', 'Granite Peak Capital', 'Hawthorne Consulting',
  'Ivywood Family Office', 'Juniper Health Systems', 'Kestrel Financial Group',
];

function monthsBack(n: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  return out;
}

async function main() {
  console.log('Seeding demo admin user...');
  await prisma.user.upsert({
    where: { email: 'akhil220997@gmail.com' },
    create: { email: 'akhil220997@gmail.com', name: 'Akhil', role: 'ADMIN' },
    update: { role: 'ADMIN' },
  });

  console.log('Seeding clients + units...');
  for (const name of CLIENT_NAMES) {
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)];
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const unitCount = 1 + Math.floor(Math.random() * 6);

    const client = await prisma.client.create({
      data: {
        name,
        segment: ['Individual', 'Small Business', 'Enterprise'][Math.floor(Math.random() * 3)],
        status: 'active',
        units: {
          create: Array.from({ length: unitCount }, () => ({
            tier,
            monthlyRate: RATES[tier],
            deliveryRegion: region,
            startDate: new Date(Date.now() - Math.floor(Math.random() * 400) * 86_400_000),
            status: 'active',
          })),
        },
      },
    });

    // A couple of QuickBooks-style invoices per client
    for (let i = 0; i < 3; i++) {
      const amount = RATES[tier] * unitCount;
      const dueDate = new Date(Date.now() - Math.floor(Math.random() * 100) * 86_400_000);
      await prisma.invoice.create({
        data: {
          quickbooksId: `qb-${client.id}-${i}`,
          clientId: client.id,
          issueDate: dueDate,
          dueDate,
          amount,
          balance: i === 0 ? amount * 0.4 : 0,
          status: i === 0 ? 'open' : 'paid',
        },
      });
    }
  }

  console.log('Seeding Salesforce-style opportunities...');
  const stages = ['Prospecting', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const clients = await prisma.client.findMany();
  for (let i = 0; i < 60; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const stage = stages[Math.floor(Math.random() * stages.length)];
    await prisma.opportunity.create({
      data: {
        salesforceId: `sf-opp-${i}`,
        clientId: client.id,
        name: `${client.name} — Expansion`,
        stage,
        amount: 5000 + Math.random() * 60000,
        isWon: stage === 'Closed Won',
        isClosed: stage.startsWith('Closed'),
        closeDate: new Date(Date.now() + Math.floor(Math.random() * 90) * 86_400_000),
      },
    });
  }

  console.log('Seeding MonthlyMetric rollups (mrr, revenue, utilization_pct)...');
  const months = monthsBack(18);
  let mrr = 5_800_000;
  for (const month of months) {
    mrr *= 1 + (0.006 + Math.random() * 0.01);
    await prisma.monthlyMetric.create({ data: { metric: 'mrr', month, value: Math.round(mrr) } });
    await prisma.monthlyMetric.create({ data: { metric: 'revenue', month, value: Math.round(mrr) } });
    await prisma.monthlyMetric.create({
      data: { metric: 'utilization_pct', month, value: Math.round((84 + Math.random() * 10) * 10) / 10 },
    });
  }

  console.log('Seeding UtilizationSnapshots by region...');
  for (const region of REGIONS) {
    const hoursIncluded = 30000 + Math.random() * 10000;
    const utilizationPct = 82 + Math.random() * 12;
    await prisma.utilizationSnapshot.create({
      data: {
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        periodEnd: new Date(),
        deliveryRegion: region,
        hoursIncluded,
        hoursDelivered: hoursIncluded * (utilizationPct / 100),
        utilizationPct,
      },
    });
  }

  console.log('Seeding FinancialStatementLine (P&L / balance sheet)...');
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = new Date();
  const revenue = mrr;
  const cogs = revenue * 0.46;
  const opex = revenue * 0.34;
  const pnlLines = [
    { account: 'Service Revenue — Prialto Units', category: 'Revenue', amount: revenue },
    { account: 'Delivery Payroll — GT', category: 'COGS', amount: -cogs * 0.33 },
    { account: 'Delivery Payroll — PH', category: 'COGS', amount: -cogs * 0.4 },
    { account: 'Delivery Payroll — KE', category: 'COGS', amount: -cogs * 0.27 },
    { account: 'Sales & Marketing', category: 'Opex', amount: -opex * 0.42 },
    { account: 'G&A', category: 'Opex', amount: -opex * 0.33 },
    { account: 'Technology & Tools', category: 'Opex', amount: -opex * 0.25 },
  ];
  for (const line of pnlLines) {
    await prisma.financialStatementLine.create({
      data: { statement: 'P&L', periodStart, periodEnd, ...line },
    });
  }
  const bsLines = [
    { account: 'Cash & Equivalents', category: 'Assets', amount: 8_400_000 },
    { account: 'Accounts Receivable', category: 'Assets', amount: 3_150_000 },
    { account: 'Accounts Payable', category: 'Liabilities', amount: -890_000 },
  ];
  for (const line of bsLines) {
    await prisma.financialStatementLine.create({
      data: { statement: 'BalanceSheet', periodStart, periodEnd, ...line },
    });
  }

  console.log('Seeding SyncRun health records...');
  for (const source of ['salesforce', 'quickbooks', 'timedoctor']) {
    await prisma.syncRun.create({
      data: {
        source,
        startedAt: new Date(Date.now() - 3_600_000),
        finishedAt: new Date(),
        status: 'success',
        recordsSynced: Math.floor(Math.random() * 500) + 50,
      },
    });
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
