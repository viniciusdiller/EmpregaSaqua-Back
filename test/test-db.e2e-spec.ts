
import { describe, it, expect } from 'vitest';
import { db } from '../src/prisma/db.js';

describe('DB Test', () => {
  it('should connect', async () => {
    try {
      await db.orm.public.Job.first();
      console.log('SUCCESS ORM');
      expect(true).toBe(true);
    } catch (e) {
      console.error('ERROR:', e);
      throw e;
    }
  });
});
