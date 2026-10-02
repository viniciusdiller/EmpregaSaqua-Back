#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2afb8b1eef77a6213c1b9ce4241e6533ec4d04e2daf8c4c7ccb3f48bb1740125/contract';
import endContract from '../../snapshots/2afb8b1eef77a6213c1b9ce4241e6533ec4d04e2daf8c4c7ccb3f48bb1740125/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/616df3be643eae88142b358571a74142ef19944e951eec0bc9a08bf89862a662/contract';
import startContract from '../../snapshots/616df3be643eae88142b358571a74142ef19944e951eec0bc9a08bf89862a662/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'message',
        column: col('attachment_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'message',
        column: col('attachment_type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'message',
        column: col('attachment_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'message',
        column: col('deleted_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'message',
        column: col('edited_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
