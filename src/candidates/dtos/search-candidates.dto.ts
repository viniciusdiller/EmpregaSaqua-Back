import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Sanitize } from '../../common/decorators/sanitize.decorator.js';

export class SearchCandidatesDto {
  @IsOptional()
  @IsString()
  @Sanitize()
  skills?: string; // Comma separated or single string

  @IsOptional()
  @IsString()
  @Sanitize()
  role?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
