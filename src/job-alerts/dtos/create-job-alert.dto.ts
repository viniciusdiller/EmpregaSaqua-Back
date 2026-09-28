import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, WorkModel } from '../../prisma/db.js';

export class CreateJobAlertDto {
  @ApiPropertyOptional({ example: 'atendente', description: 'Palavra-chave no título da vaga' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
  keyword?: string;

  @ApiPropertyOptional({ example: 'Bacaxá' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
  address?: string;

  @ApiPropertyOptional({ enum: WorkModel })
  @IsOptional()
  @IsEnum(WorkModel)
  work_model?: WorkModel;

  @ApiPropertyOptional({ enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  contract_type?: ContractType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_pcd?: boolean;
}
