import { IsOptional, IsString, IsUrl, IsEnum } from 'class-validator';

export class CreateApplicationDto {
  @IsOptional()
  @IsString()
  cover_letter?: string;

  @IsOptional()
  @IsUrl()
  resume_url?: string;
}
