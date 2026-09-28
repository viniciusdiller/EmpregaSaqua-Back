import { IsString, Length } from 'class-validator';

export class ConfirmAccountDeletionDto {
  @Length(64, 64)
  @IsString()
  token!: string;
}
