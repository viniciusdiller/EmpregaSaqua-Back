import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ example: 'TechSaqua Soluções', description: 'Nome fantasia da empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => sanitizeHtml(value))
  nome_fantasia?: string;

  @ApiPropertyOptional({ example: 'Av. Saquarema, 456 - Centro', description: 'Endereço da empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => sanitizeHtml(value))
  endereco?: string;

  @ApiPropertyOptional({ example: '12345678000190', description: 'CNPJ, apenas dígitos' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve conter 14 dígitos.' })
  cnpj?: string;

  @ApiPropertyOptional({ example: '22999999999', description: 'Telefone comercial, apenas dígitos com DDD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'Telefone com DDD (10 a 13 dígitos).' })
  telefone?: string;
}
