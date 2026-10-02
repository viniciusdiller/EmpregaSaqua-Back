import { IsString, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Sanitize } from '../../common/decorators/sanitize.decorator.js';
import { JobArea } from '../../prisma/db.js';

export class CreateExperienceDto {
  @IsString()
  @Sanitize()
  company: string;

  @IsString()
  @Sanitize()
  role: string;

  @IsString()
  @Sanitize()
  start_date: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  end_date?: string;

  @IsString()
  @Sanitize()
  description: string;
}

export class CreateEducationDto {
  @IsString()
  @Sanitize()
  institution: string;

  @IsString()
  @Sanitize()
  degree: string;

  @IsString()
  @Sanitize()
  field_of_study: string;

  @IsString()
  @Sanitize()
  start_date: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  end_date?: string;
}

export class UpdateCandidateProfileDto {
  @IsOptional()
  @IsString()
  @Sanitize()
  full_name?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  bio?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  telefone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Sanitize()
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Sanitize()
  languages?: string[];

  @IsOptional()
  @IsEnum(JobArea)
  area?: JobArea;

  @IsOptional()
  @IsString()
  @Sanitize()
  address?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceDto)
  experiences?: CreateExperienceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEducationDto)
  educations?: CreateEducationDto[];
}
