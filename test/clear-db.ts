import { db } from '../src/prisma/db.js';

export async function clearDatabase() {
  const runtime = db.runtime();
  await runtime.execute(db.sql.public.job.delete().build());
  await runtime.execute(db.sql.public.user.delete().build());
}
