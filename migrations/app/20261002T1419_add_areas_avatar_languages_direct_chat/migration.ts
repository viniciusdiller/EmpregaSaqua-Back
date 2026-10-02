#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2afb8b1eef77a6213c1b9ce4241e6533ec4d04e2daf8c4c7ccb3f48bb1740125/contract';
import startContract from '../../snapshots/2afb8b1eef77a6213c1b9ce4241e6533ec4d04e2daf8c4c7ccb3f48bb1740125/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/802fe0231e9ee0803b74c1ea4cc5c3e78bb6d9f98116a6a059aad988721aed28/contract';
import endContract from '../../snapshots/802fe0231e9ee0803b74c1ea4cc5c3e78bb6d9f98116a6a059aad988721aed28/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'candidateProfile',
        column: col('area', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'candidateProfile',
        column: col('avatar_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'candidateProfile',
        column: col('languages', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'job',
        column: col('area', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'chatRoom', column: 'job_id' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'candidateProfile',
        constraint: 'candidateProfile_area_check_fc1a8ede',
        expression:
          "\"area\" IN ('ADMINISTRACAO', 'TI', 'SAUDE', 'EDUCACAO', 'COMERCIO_VENDAS', 'ALIMENTACAO', 'CONSTRUCAO', 'LIMPEZA_SERVICOS_GERAIS', 'LOGISTICA_TRANSPORTE', 'TURISMO_HOTELARIA', 'OUTROS')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'candidateProfile',
        constraint: 'candidateProfile_languages_elem_not_null_d4aa0a00',
        expression: 'array_position("languages", NULL) IS NULL',
      }),
      this.addUnique({
        schema: 'public',
        table: 'chatRoom',
        constraint: 'chatRoom_candidate_id_employer_id_job_id_key',
        columns: ['candidate_id', 'employer_id', 'job_id'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'job',
        constraint: 'job_area_check_fc1a8ede',
        expression:
          "\"area\" IN ('ADMINISTRACAO', 'TI', 'SAUDE', 'EDUCACAO', 'COMERCIO_VENDAS', 'ALIMENTACAO', 'CONSTRUCAO', 'LIMPEZA_SERVICOS_GERAIS', 'LOGISTICA_TRANSPORTE', 'TURISMO_HOTELARIA', 'OUTROS')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
