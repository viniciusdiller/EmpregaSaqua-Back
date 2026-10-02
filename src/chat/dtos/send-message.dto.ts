import { IsUUID, IsString, IsOptional, IsIn, MinLength, MaxLength, Matches } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  roomId!: string;

  // Opcional quando a mensagem é só um anexo — ChatService.saveMessage exige pelo menos um dos dois.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  // Sempre um path local nosso (/uploads/...), nunca uma URL externa — evita que o chat vire um jeito de linkar qualquer coisa.
  @IsOptional()
  @IsString()
  @Matches(/^\/uploads\//)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  attachmentName?: string;

  @IsOptional()
  @IsIn(['image', 'document'])
  attachmentType?: string;
}
