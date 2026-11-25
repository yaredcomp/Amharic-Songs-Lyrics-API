// Seeds the runtime (Drizzle) PostgreSQL database with the curated Amharic lyrics.
// Usage: npm run db:seed
//
// Idempotent: rows already present (matched by title + artist) are skipped, so it
// is safe to run repeatedly and against a database that already has demo data.

import 'dotenv/config';
import { db, pool } from '../src/db/index.ts';
import { lyrics } from '../src/db/schema.ts';
import { LYRICS_SEED } from '../prisma/seed-data.ts';

async function main(): Promise<void> {
  const existing = await db
    .select({ title: lyrics.title, artist: lyrics.artist })
    .from(lyrics);

  const existingKeys = new Set(existing.map((row) => `${row.title}\u0000${row.artist}`));
  const missing = LYRICS_SEED.filter(
    (song) => !existingKeys.has(`${song.title}\u0000${song.artist}`)
  );

  if (missing.length === 0) {
    console.log(`No new lyrics to seed (${existing.length} records already present).`);
    return;
  }

  await db.insert(lyrics).values(missing);
  console.log(
    `Seeded ${missing.length} lyrics records. Total rows: ${existing.length + missing.length}.`
  );
}

main()
  .catch((err) => {
    console.error('Lyrics seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
