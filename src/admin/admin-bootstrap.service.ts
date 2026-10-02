import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '../prisma/db.js';

/**
 * Garante que existe uma conta ADMIN com o e-mail/senha do .env (ADMIN_EMAIL/ADMIN_PASSWORD).
 * O .env é a fonte da verdade: se a senha salva não bater mais com a do .env, ela é atualizada
 * a cada boot. Sem essas duas variáveis, nada acontece (não força criação de admin em produção
 * sem querer).
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL/ADMIN_PASSWORD não configurados no .env — nenhuma conta admin será criada/atualizada automaticamente.');
      return;
    }
    if (password.length < 8) {
      this.logger.error('ADMIN_PASSWORD tem menos de 8 caracteres — ignorando (defina uma senha forte no .env).');
      return;
    }

    const existing = await this.prisma.user.where({ email }).first();

    if (!existing) {
      const password_hash = await bcrypt.hash(password, 10);
      await this.prisma.user.create({ email, password_hash, role: Role.ADMIN });
      this.logger.log(`Conta ADMIN criada a partir do .env: ${email}`);
      return;
    }

    const passwordMatches = await bcrypt.compare(password, existing.password_hash);
    const needsPromotion = existing.role !== Role.ADMIN;
    if (passwordMatches && !needsPromotion) {
      return;
    }

    const password_hash = passwordMatches ? existing.password_hash : await bcrypt.hash(password, 10);
    await this.prisma.user.where({ id: existing.id }).update({
      password_hash,
      role: Role.ADMIN,
    });
    this.logger.log(`Conta ADMIN sincronizada com o .env: ${email}${needsPromotion ? ' (promovida a ADMIN)' : ' (senha atualizada)'}`);
  }
}
