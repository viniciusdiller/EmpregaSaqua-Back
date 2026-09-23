#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9fc1c0d0feef7cac3352eda61868eaba78072f71c6cf42cc1ed1504a77899df2/contract';
import endContract from '../../snapshots/9fc1c0d0feef7cac3352eda61868eaba78072f71c6cf42cc1ed1504a77899df2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f076f59974e4696e7292487937803a4281f86be1e07082257b5acee6d7b1fa92/contract';
import startContract from '../../snapshots/f076f59974e4696e7292487937803a4281f86be1e07082257b5acee6d7b1fa92/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);
