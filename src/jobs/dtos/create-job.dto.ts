import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEmail, Matches, IsArray, ArrayMaxSize, ValidateNested, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkModel, ContractType } from '../../prisma/db.js';

export class JobQuestionDto {
  @ApiProperty({ example: 'Tem experiência com CNH D?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  question_text: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  expected_answer: boolean;
}

export class CreateJobDto {
  @ApiProperty({ example: 'Desenvolvedor Frontend Sênior', description: 'Título da vaga' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => sanitizeHtml(value))
  title: string;

  @ApiProperty({ example: 'Procuramos um desenvolvedor para atuar no core banking...', description: 'Descrição detalhada e responsabilidades' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  @Transform(({ value }) => sanitizeHtml(value, {
    allowedTags: [], // Apenas texto puro
    allowedAttributes: {}
  }))
  description: string;

  @ApiProperty({ example: 'Avenida Saquarema, 123 - Bacaxá', description: 'Endereço específico do local de trabalho' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => sanitizeHtml(value))
  address: string;

  @ApiProperty({ example: 'Escala 5x2 (Seg a Sex das 08h as 17h)', description: 'Carga horária e jornada de trabalho' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => sanitizeHtml(value))
  work_schedule: string;

  @ApiPropertyOptional({ example: 'R$ 3.000 a R$ 4.500', description: 'Faixa salarial oferecida' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  salary_range?: string;

  @ApiProperty({ example: ['Ensino Superior Completo', 'Mínimo 3 anos de experiência com React'], description: 'Requisitos obrigatórios para a vaga', isArray: true })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => sanitizeHtml(v)).filter(v => v.trim().length > 0) : value)
  mandatory_qualifications: string[];

  @ApiProperty({ example: ['Conhecimento em NestJS', 'Inglês Intermediário'], description: 'Requisitos diferenciais', isArray: true })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => sanitizeHtml(v)).filter(v => v.trim().length > 0) : value)
  differential_qualifications: string[];

  @ApiProperty({ example: ['Vale Transporte', 'Vale Alimentação', 'Plano de Saúde'], description: 'Benefícios oferecidos', isArray: true })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => sanitizeHtml(v)).filter(v => v.trim().length > 0) : value)
  benefits: string[];

  @ApiProperty({ enum: WorkModel, example: WorkModel.REMOTE, description: 'Modelo de trabalho' })
  @IsEnum(WorkModel)
  work_model: WorkModel;

  @ApiProperty({ enum: ContractType, example: ContractType.CLT, description: 'Tipo de contrato' })
  @IsEnum(ContractType)
  contract_type: ContractType;

  @ApiPropertyOptional({ example: true, description: 'Visibilidade do salário para os candidatos' })
  @IsOptional()
  @IsBoolean()
  is_salary_visible?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Vaga afirmativa para PCD' })
  @IsOptional()
  @IsBoolean()
  is_pcd?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'Data limite para se candidatar' })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({ example: '22999999999', description: 'WhatsApp de contato para envio rápido' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{10,15}$/, { message: 'WhatsApp deve conter apenas números, incluindo DDI e DDD.' })
  contact_whatsapp?: string;

  @ApiPropertyOptional({ example: 'vagas@empregasaqua.com', description: 'E-mail alternativo de contato' })
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @ApiPropertyOptional({ 
    example: [{ question_text: 'Você tem disponibilidade para trabalhar aos finais de semana?', expected_answer: true }], 
    description: 'Perguntas de triagem (Knockout questions)',
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobQuestionDto)
  questions?: JobQuestionDto[];
}
