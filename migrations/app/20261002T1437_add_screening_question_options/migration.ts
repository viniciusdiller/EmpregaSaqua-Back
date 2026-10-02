#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/802fe0231e9ee0803b74c1ea4cc5c3e78bb6d9f98116a6a059aad988721aed28/contract';
import startContract from '../../snapshots/802fe0231e9ee0803b74c1ea4cc5c3e78bb6d9f98116a6a059aad988721aed28/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/86303abe25aff9c5866660eaabf7a9de16eabf98f3d1670c25bbdc4c654dc380/contract';
import endContract from '../../snapshots/86303abe25aff9c5866660eaabf7a9de16eabf98f3d1670c25bbdc4c654dc380/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'applicationAnswer', column: 'answer' }),
      this.dropColumn({ schema: 'public', table: 'jobQuestion', column: 'expected_answer' }),
      this.createTable({
        schema: 'public',
        table: 'questionOption',
        columns: [
          col('eliminates', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('option_text', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('question_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'applicationAnswer',
        column: col('option_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      // Sem opções pré-existentes pra referenciar (QuestionOption é novo), não dá pra backfillar
      // um option_id válido pras respostas antigas — e como não há nenhuma linha em applicationAnswer
      // ainda (candidatura com perguntas de triagem é feature nova), isso remove 0 linhas na prática.
      this.dataTransform(contract, 'backfill-applicationAnswer-option_id', {
        check: () => db.public.applicationAnswer.select('id').where((f, fns) => fns.eq(f.option_id, null)).limit(1),
        run: () => db.public.applicationAnswer.delete().where((f, fns) => fns.eq(f.option_id, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'applicationAnswer', column: 'option_id' }),
      this.createIndex({
        schema: 'public',
        table: 'applicationAnswer',
        index: 'applicationAnswer_option_id_idx_0c2968fe',
        columns: ['option_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'questionOption',
        index: 'questionOption_question_id_idx_fcfb223c',
        columns: ['question_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'questionOption',
        foreignKey: {
          name: 'questionOption_question_id_fkey',
          columns: ['question_id'],
          references: { schema: 'public', table: 'jobQuestion', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'applicationAnswer',
        foreignKey: {
          name: 'applicationAnswer_option_id_fkey',
          columns: ['option_id'],
          references: { schema: 'public', table: 'questionOption', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
