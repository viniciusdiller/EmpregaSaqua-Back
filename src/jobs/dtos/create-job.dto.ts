import { 
  IsString, 
  IsNotEmpty, 
  MaxLength, 
  IsOptional, 
  IsEmail, 
  Matches 
} from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => sanitizeHtml(value))
  company_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => sanitizeHtml(value))
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Transform(({ value }) => sanitizeHtml(value, {
    allowedTags: [], // Apenas texto puro
    allowedAttributes: {}
  }))
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => sanitizeHtml(value))
  location: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{10,15}$/, { message: 'WhatsApp deve conter apenas números, incluindo DDI e DDD.' })
  contact_whatsapp?: string;

  @IsEmail()
  @IsOptional()
  contact_email?: string;
}
