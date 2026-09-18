import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '../../prisma/db.js';

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
