import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PlanTier } from '../src/generated/prisma/enums.js';

interface SeedPlan {
  tier: PlanTier;
  name: string;
  description: string;
  maxStores: number;
  maxProducts: number;
  maxImports: number;
  maxMembers: number;
  analytics: boolean;
  alerts: boolean;
  advertising: boolean;
}

const plans: SeedPlan[] = [
  {
    tier: PlanTier.FREE,
    name: 'Gratuito',
    description: 'Plano inicial para pequenos comerciantes.',
    maxStores: 1,
    maxProducts: 100,
    maxImports: 3,
    maxMembers: 2,
    analytics: false,
    alerts: false,
    advertising: false,
  },
  {
    tier: PlanTier.PRO,
    name: 'Profissional',
    description: 'Para comerciantes em crescimento com analytics e alertas.',
    maxStores: 5,
    maxProducts: 1000,
    maxImports: 20,
    maxMembers: 10,
    analytics: true,
    alerts: true,
    advertising: true,
  },
  {
    tier: PlanTier.PREMIUM,
    name: 'Premium',
    description: 'Para operações de grande porte com limites elevados.',
    maxStores: 50,
    maxProducts: 10000,
    maxImports: 100,
    maxMembers: 50,
    analytics: true,
    alerts: true,
    advertising: true,
  },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const plan of plans) {
      const { tier, ...rest } = plan;
      await prisma.plan.upsert({
        where: { tier },
        update: { ...rest, active: true },
        create: { tier, ...rest, active: true },
      });
      console.log(`✔ Plan ${tier} upserted`);
    }
    console.log('Seed completed successfully');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
