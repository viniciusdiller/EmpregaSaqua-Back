#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/9fc1c0d0feef7cac3352eda61868eaba78072f71c6cf42cc1ed1504a77899df2/contract';
import startContract from '../../snapshots/9fc1c0d0feef7cac3352eda61868eaba78072f71c6cf42cc1ed1504a77899df2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fd6bf74fc38d33b8ea2fd8ae9d3eb78f4d7936a5b95278a7d7980295e037dfa4/contract';
import endContract from '../../snapshots/fd6bf74fc38d33b8ea2fd8ae9d3eb78f4d7936a5b95278a7d7980295e037dfa4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'candidateProfile',
        column: col('full_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'companyProfile',
        column: col('telefone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
