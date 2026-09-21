import { IsOptional, IsString, IsUrl, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplicationAnswerDto {
  @IsString()
  question_id: string;

  @IsBoolean()
  answer: boolean;
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
