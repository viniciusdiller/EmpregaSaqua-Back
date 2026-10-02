import { IsUUID } from 'class-validator';

export class TypingDto {
  @IsUUID()
  roomId!: string;
}
