import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract, Models } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

console.log('db.ts evaluating, DATABASE_URL is:', process.env['DATABASE_URL']);

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});

export type User = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_User>;
export type Job = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_Job>;
export type Application = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_Application>;

export enum Role {
  JOB_SEEKER = 'JOB_SEEKER',
  EMPLOYER = 'EMPLOYER',
  ADMIN = 'ADMIN'
}

export enum JobStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FILLED = 'FILLED',
  REJECTED = 'REJECTED'
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}
