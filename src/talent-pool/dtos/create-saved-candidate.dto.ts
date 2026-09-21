import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class CreateSavedCandidateDto {
  @ApiProperty({ example: 'uuid-do-candidato', description: 'ID do candidato que será salvo no banco de talentos' })
  @IsString()
  @IsNotEmpty()
  candidate_id: string;

  @ApiPropertyOptional({ example: 'Excelente perfil para backend com NestJS', description: 'Anotações privadas do recrutador sobre o candidato' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  notes?: string;
}
