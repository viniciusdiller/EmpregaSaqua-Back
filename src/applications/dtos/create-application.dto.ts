import { IsOptional, IsString, IsUrl, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplicationAnswerDto {
  @IsString()
  question_id: string;

  @IsUUID()
  option_id: string;
}

export class CreateApplicationDto {
  @IsOptional()
  @IsString()
  cover_letter?: string;

  @IsOptional()
  @IsUrl()
  resume_url?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAnswerDto)
  answers?: ApplicationAnswerDto[];
}
