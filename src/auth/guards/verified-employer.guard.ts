import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { db, Role, VerificationStatus } from '../../prisma/db.js';

@Injectable()
export class VerifiedEmployerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If there is no user or the user is not an employer, we let the RolesGuard handle it.
    // However, if we reach this point, they should be authenticated and potentially an employer.
    if (!user || user.role !== Role.EMPLOYER) {
      return true; // We only restrict EMPLOYERs. Admin doesn't need verification.
    }

    // Check verification status from the database
    const companyProfile = await db.orm.public.CompanyProfile.first({ user_id: user.id });

    if (!companyProfile) {
      throw new ForbiddenException('Perfil de empresa não encontrado.');
    }

    if (companyProfile.verification_status !== VerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Sua conta de recrutador ainda não foi verificada. Por favor, envie seu documento comprobatório e aguarde a aprovação.',
      );
    }

    return true;
  }
}
