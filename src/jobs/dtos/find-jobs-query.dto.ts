import { IsOptional, IsString, IsInt, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { JobStatus, WorkModel, ContractType } from '../../prisma/db.js';

export class FindJobsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  address?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title_like?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsEnum(WorkModel)
  work_model?: WorkModel;

  @IsOptional()
  @IsEnum(ContractType)
  contract_type?: ContractType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  is_pcd?: boolean;
}
