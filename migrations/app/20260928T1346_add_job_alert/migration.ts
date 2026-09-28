#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/da4eaa5b5d812654a9cc918224afff5f77bc5051accaae43ec0976f4a6ae9c58/contract';
import endContract from '../../snapshots/da4eaa5b5d812654a9cc918224afff5f77bc5051accaae43ec0976f4a6ae9c58/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fd6bf74fc38d33b8ea2fd8ae9d3eb78f4d7936a5b95278a7d7980295e037dfa4/contract';
import startContract from '../../snapshots/fd6bf74fc38d33b8ea2fd8ae9d3eb78f4d7936a5b95278a7d7980295e037dfa4/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'jobAlert',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('candidate_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contract_type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('is_pcd', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('keyword', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('work_model', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'jobAlert_contract_type_check_fd665d87',
            "\"contract_type\" IN ('CLT', 'PJ', 'INTERNSHIP', 'FREELANCE', 'APPRENTICE')",
          ),
          checkExpression(
            'jobAlert_work_model_check_8396d0c5',
            "\"work_model\" IN ('ON_SITE', 'HYBRID', 'REMOTE')",
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'jobAlert',
        index: 'jobAlert_candidate_id_idx_2164cd9a',
        columns: ['candidate_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'jobAlert',
        foreignKey: {
          name: 'jobAlert_candidate_id_fkey',
          columns: ['candidate_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
