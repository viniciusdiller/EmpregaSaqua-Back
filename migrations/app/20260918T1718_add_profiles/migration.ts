#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/649af8bbb60b5a4e91516fb2d46b9849f589487d57447acb55a4bf99eb177d14/contract';
import endContract from '../../snapshots/649af8bbb60b5a4e91516fb2d46b9849f589487d57447acb55a4bf99eb177d14/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fdd82d3032e8e6a15645ce04f9d7970ffdcb9836a3ec182efc776f601fba61bf/contract';
import startContract from '../../snapshots/fdd82d3032e8e6a15645ce04f9d7970ffdcb9836a3ec182efc776f601fba61bf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'candidateProfile',
        columns: [
          col('bio', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('habilidades', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resume_text', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('telefone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'companyProfile',
        columns: [
          col('cnpj', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endereco', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('logo_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('nome_fantasia', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'candidateProfile',
        constraint: 'candidateProfile_user_id_key',
        columns: ['user_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'companyProfile',
        constraint: 'companyProfile_user_id_key',
        columns: ['user_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'companyProfile',
        constraint: 'companyProfile_cnpj_key',
        columns: ['cnpj'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'candidateProfile',
        foreignKey: {
          name: 'candidateProfile_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'companyProfile',
        foreignKey: {
          name: 'companyProfile_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
