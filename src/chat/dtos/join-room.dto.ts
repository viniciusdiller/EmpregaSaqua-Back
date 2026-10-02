import { IsUUID, IsOptional } from 'class-validator';

export class JoinRoomDto {
  @IsUUID()
  candidateId!: string;

  @IsUUID()
  employerId!: string;

  // Ausente = conversa direta (banco de talentos), sem vaga associada.
  @IsOptional()
  @IsUUID()
  jobId?: string;
}
