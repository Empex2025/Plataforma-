import { readFileSync } from 'node:fs';
import pg from 'pg';

function loadEnv() {
  try {
    const content = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    return;
  }
}

loadEnv();

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/local_commerce';

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const emailArg = args.find((arg) => !arg.startsWith('--'));

const client = new pg.Client({ connectionString });
await client.connect();

const conditions = ["c.status = 'PENDING'"];
const params = [];
if (emailArg) {
  params.push(emailArg);
  conditions.push(`u.email = $${params.length}`);
}

const pending = await client.query(
  `SELECT c.id, c.name, c.status, u.email
   FROM companies c
   JOIN user_companies uc ON uc.company_id = c.id
   JOIN users u ON u.id = uc.user_id
   WHERE ${conditions.join(' AND ')}
   ORDER BY c.created_at DESC`,
  params,
);

if (pending.rows.length === 0) {
  console.log(
    `No PENDING companies found${emailArg ? ` for ${emailArg}` : ''}.`,
  );
  await client.end();
  process.exit(0);
}

for (const row of pending.rows) {
  if (listOnly) {
    console.log(`PENDING id=${row.id} name="${row.name}" email=${row.email}`);
    continue;
  }

  await client.query(
    `UPDATE companies SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
    [row.id],
  );
  console.log(`APPROVED name="${row.name}" email=${row.email}`);
}

await client.end();
