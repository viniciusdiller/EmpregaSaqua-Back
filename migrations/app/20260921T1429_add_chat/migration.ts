#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/649af8bbb60b5a4e91516fb2d46b9849f589487d57447acb55a4bf99eb177d14/contract';
import startContract from '../../snapshots/649af8bbb60b5a4e91516fb2d46b9849f589487d57447acb55a4bf99eb177d14/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f076f59974e4696e7292487937803a4281f86be1e07082257b5acee6d7b1fa92/contract';
import endContract from '../../snapshots/f076f59974e4696e7292487937803a4281f86be1e07082257b5acee6d7b1fa92/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'candidateProfile', column: 'resume_text' }),
      this.dropColumn({ schema: 'public', table: 'job', column: 'company_name' }),
      this.dropColumn({ schema: 'public', table: 'job', column: 'location' }),
      this.createTable({
        schema: 'public',
        table: 'chatRoom',
        columns: [
          col('candidate_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('employer_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('job_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'education',
        columns: [
          col('candidate_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('degree', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('end_date', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('field_of_study', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('institution', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('start_date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'experience',
        columns: [
          col('candidate_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('company', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('end_date', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('start_date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'message',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('is_read', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('room_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sender_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'candidateProfile',
        column: col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'candidateProfile',
        column: col('skills', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'companyProfile',
        column: col('verification_document_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'companyProfile',
        column: col('verification_status', 'text', {
          notNull: true,
          default: lit('PENDING'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'job',
        column: col('address', 'text', {
          notNull: true,
          default: lit(''),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'job',
        column: col('benefits', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'job',
        column: col('differential_qualifications', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'job',
        column: col('mandatory_qualifications', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'job',
        column: col('salary_range', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'job',
        column: col('work_schedule', 'text', {
          notNull: true,
          default: lit(''),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'candidateProfile',
        constraint: 'candidateProfile_skills_elem_not_null_79c19a4f',
        expression: 'array_position("skills", NULL) IS NULL',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'companyProfile',
        constraint: 'companyProfile_verification_status_check_53b64910',
        expression: "\"verification_status\" IN ('PENDING', 'APPROVED', 'REJECTED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'job',
        constraint: 'job_benefits_elem_not_null_5177c089',
        expression: 'array_position("benefits", NULL) IS NULL',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'job',
        constraint: 'job_differential_qualifications_elem_not_null_d51d828c',
        expression: 'array_position("differential_qualifications", NULL) IS NULL',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'job',
        constraint: 'job_mandatory_qualifications_elem_not_null_6f2a780a',
        expression: 'array_position("mandatory_qualifications", NULL) IS NULL',
      }),
      this.createIndex({
        schema: 'public',
        table: 'chatRoom',
        index: 'chatRoom_candidate_id_idx_2164cd9a',
        columns: ['candidate_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chatRoom',
        index: 'chatRoom_employer_id_idx_f3c7e77d',
        columns: ['employer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chatRoom',
        index: 'chatRoom_job_id_idx_58a5bbdd',
        columns: ['job_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'education',
        index: 'education_candidate_id_idx_2164cd9a',
        columns: ['candidate_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'experience',
        index: 'experience_candidate_id_idx_2164cd9a',
        columns: ['candidate_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_room_id_idx_c32a1e8c',
        columns: ['room_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_sender_id_idx_311853a4',
        columns: ['sender_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chatRoom',
        foreignKey: {
          name: 'chatRoom_job_id_fkey',
          columns: ['job_id'],
          references: { schema: 'public', table: 'job', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chatRoom',
        foreignKey: {
          name: 'chatRoom_candidate_id_fkey',
          columns: ['candidate_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chatRoom',
        foreignKey: {
          name: 'chatRoom_employer_id_fkey',
          columns: ['employer_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'education',
        foreignKey: {
          name: 'education_candidate_id_fkey',
          columns: ['candidate_id'],
          references: { schema: 'public', table: 'candidateProfile', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'experience',
        foreignKey: {
          name: 'experience_candidate_id_fkey',
          columns: ['candidate_id'],
          references: { schema: 'public', table: 'candidateProfile', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'message',
        foreignKey: {
          name: 'message_room_id_fkey',
          columns: ['room_id'],
          references: { schema: 'public', table: 'chatRoom', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'message',
        foreignKey: {
          name: 'message_sender_id_fkey',
          columns: ['sender_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
