import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../prisma/db.js';

export class CreateUserDto {
  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password: string;

  // Restrito a JOB_SEEKER/EMPLOYER: ADMIN nunca pode ser criado por cadastro público.
  @IsOptional()
  @IsIn([Role.JOB_SEEKER, Role.EMPLOYER], { message: 'Role inválido' })
  role?: Role;

  // ---------- Empresa (role EMPLOYER) — cria o CompanyProfile já no cadastro ----------

  @ApiPropertyOptional({ example: 'Mercado Bom Preço', description: 'Nome fantasia (obrigatório quando role=EMPLOYER)' })
  @ValidateIf((o) => o.role === Role.EMPLOYER)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da empresa.' })
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
  nome_fantasia?: string;

  @ApiPropertyOptional({ example: '12345678000190', description: 'CNPJ, apenas dígitos' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve conter 14 dígitos.' })
  cnpj?: string;

  @ApiPropertyOptional({ example: 'Av. Saquarema, 456 - Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
  endereco?: string;

  // ---------- Candidato (role JOB_SEEKER) — cria o CandidateProfile já no cadastro ----------

  @ApiPropertyOptional({ example: 'Joana da Silva', description: 'Nome completo (obrigatório quando role=JOB_SEEKER)' })
  @ValidateIf((o) => o.role === Role.JOB_SEEKER)
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome completo.' })
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
  full_name?: string;

  @ApiPropertyOptional({ example: 'Bacaxá, Saquarema - RJ', description: 'Cidade/bairro (candidato)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
  address?: string;

  @ApiPropertyOptional({ example: 'Atendente com 3 anos de experiência em comércio local.', description: 'Resumo profissional curto (candidato)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
  bio?: string;

  // ---------- Compartilhado (empresa ou candidato) ----------

  @ApiPropertyOptional({ example: '22999999999', description: 'Telefone/WhatsApp, apenas dígitos com DDD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'Telefone com DDD (10 a 13 dígitos).' })
  telefone?: string;
}
