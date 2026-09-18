#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/fdd82d3032e8e6a15645ce04f9d7970ffdcb9836a3ec182efc776f601fba61bf/contract';
import endContract from '../../snapshots/fdd82d3032e8e6a15645ce04f9d7970ffdcb9836a3ec182efc776f601fba61bf/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'application',
        columns: [
          col('applicant_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('cover_letter', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('job_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resume_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'application_status_check_e0a4d60d',
            "\"status\" IN ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'job',
        columns: [
          col('company_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contact_email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contact_whatsapp', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deleted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('employer_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('location', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'job_status_check_76cde6b1',
            "\"status\" IN ('PENDING', 'ACTIVE', 'FILLED', 'REJECTED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('EMPLOYER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_role_check_c2616f8e',
            "\"role\" IN ('JOB_SEEKER', 'EMPLOYER', 'ADMIN')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'application',
        constraint: 'application_job_id_applicant_id_key',
        columns: ['job_id', 'applicant_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'application',
        index: 'application_applicant_id_idx_692f8762',
        columns: ['applicant_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'application',
        index: 'application_job_id_idx_58a5bbdd',
        columns: ['job_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'job',
        index: 'job_employer_id_idx_f3c7e77d',
        columns: ['employer_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'application',
        foreignKey: {
          name: 'application_job_id_fkey',
          columns: ['job_id'],
          references: { schema: 'public', table: 'job', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'application',
        foreignKey: {
          name: 'application_applicant_id_fkey',
          columns: ['applicant_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'job',
        foreignKey: {
          name: 'job_employer_id_fkey',
          columns: ['employer_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
