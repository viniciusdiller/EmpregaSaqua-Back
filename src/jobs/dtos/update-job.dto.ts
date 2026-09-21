import { PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto.js';
import { IsEnum, IsOptional } from 'class-validator';
import { JobStatus } from '../../prisma/db.js';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({ enum: JobStatus, description: 'Apenas Admin pode editar o status diretamente por aqui.' })
  @IsOptional()
  @IsEnum(JobStatus, { message: 'Status inválido.' })
  status?: JobStatus;
}
