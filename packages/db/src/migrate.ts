// Migratsiyalarni DATABASE_URL ga qo'llaydi (Railway release bosqichida ishlaydi).
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL aniqlanmagan.');
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
const sql = postgres(url, { max: 1 });

try {
  await migrate(drizzle(sql), { migrationsFolder });
  console.warn('✅ Migratsiyalar qo‘llandi.');
} catch (e) {
  console.error('Migratsiya xatosi:', e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
