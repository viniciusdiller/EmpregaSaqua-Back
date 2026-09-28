#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/616df3be643eae88142b358571a74142ef19944e951eec0bc9a08bf89862a662/contract';
import endContract from '../../snapshots/616df3be643eae88142b358571a74142ef19944e951eec0bc9a08bf89862a662/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/da4eaa5b5d812654a9cc918224afff5f77bc5051accaae43ec0976f4a6ae9c58/contract';
import startContract from '../../snapshots/da4eaa5b5d812654a9cc918224afff5f77bc5051accaae43ec0976f4a6ae9c58/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('deletion_token', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('deletion_token_expires_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_deletion_token_key',
        columns: ['deletion_token'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
