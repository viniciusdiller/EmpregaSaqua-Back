import { IsString, IsOptional, MaxLength } from 'class-validator';
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
}
