import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../prisma/db.js';

export class UpdateUserRoleDto {
  @IsNotEmpty({ message: 'A role não pode ser vazia.' })
  @IsEnum(Role, { message: 'A role deve ser um valor válido (JOB_SEEKER, EMPLOYER, ADMIN).' })
  role: Role;
}
