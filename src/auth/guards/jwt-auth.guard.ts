import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First validate the JWT signature/expiry via Passport
    await super.canActivate(context);

    // Then verify the user account still exists in the database
    // This covers cases like deleted accounts with still-valid tokens
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.where({ id: userId }).first();
    if (!user) throw new UnauthorizedException('Conta não encontrada ou foi removida.');

    return true;
  }
}
