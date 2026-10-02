import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract, Models } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});

export type User = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_User>;
export type Job = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_Job>;
export type Application = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_Application>;
export type CompanyProfile = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_CompanyProfile>;
export type CandidateProfile = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_CandidateProfile>;
export type Experience = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_Experience>;
export type Education = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_Education>;
export type AuditLog = import('@prisma/orm-postgres/family-contract/types').Scalars<Models.public_AuditLog>;

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
  APPLIED = 'APPLIED',
  REVIEWING = 'REVIEWING',
  INTERVIEW = 'INTERVIEW',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum WorkModel {
  ON_SITE = 'ON_SITE',
  HYBRID = 'HYBRID',
  REMOTE = 'REMOTE'
}

export enum ContractType {
  CLT = 'CLT',
  PJ = 'PJ',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
  APPRENTICE = 'APPRENTICE'
}

export enum JobArea {
  ADMINISTRACAO = 'ADMINISTRACAO',
  TI = 'TI',
  SAUDE = 'SAUDE',
  EDUCACAO = 'EDUCACAO',
  COMERCIO_VENDAS = 'COMERCIO_VENDAS',
  ALIMENTACAO = 'ALIMENTACAO',
  CONSTRUCAO = 'CONSTRUCAO',
  LIMPEZA_SERVICOS_GERAIS = 'LIMPEZA_SERVICOS_GERAIS',
  LOGISTICA_TRANSPORTE = 'LOGISTICA_TRANSPORTE',
  TURISMO_HOTELARIA = 'TURISMO_HOTELARIA',
  OUTROS = 'OUTROS'
}