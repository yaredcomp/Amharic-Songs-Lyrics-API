// Standalone Prisma seed script for Render PostgreSQL deployments.
// Usage: npx prisma db seed
//
// Idempotent: rows already present (matched by title + artist) are skipped so the
// script can be re-run safely on an existing database.

import { PrismaClient } from '@prisma/client';
import { LYRICS_SEED } from './seed-data';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.lyrics.findMany({
    select: { title: true, artist: true },
  });
  const existingKeys = new Set(existing.map((row) => `${row.title}\u0000${row.artist}`));
  const missing = LYRICS_SEED.filter(
    (song) => !existingKeys.has(`${song.title}\u0000${song.artist}`)
  );

  if (missing.length === 0) {
    console.log(`No new lyrics to seed (${existing.length} records already present).`);
    return;
  }

  await prisma.lyrics.createMany({
    data: missing,
  });

  console.log(
    `Seeded ${missing.length} Amharic lyrics records. Total rows: ${existing.length + missing.length}.`
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
