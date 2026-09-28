import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateCompanyProfileDto } from './dtos/update-company-profile.dto.js';
import { Role, User, db } from '../prisma/db.js';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const DELETION_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.where({ email }).first();
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.where({ id }).first();
  }

  /**
   * Cria o usuário e, na mesma transação, a ficha de perfil (CompanyProfile/CandidateProfile)
   * já com os dados coletados no cadastro. Sem isso, PATCH /users/company-profile e
   * PATCH /candidates/profile 404 para sempre em uma conta nova (nada mais cria essas linhas).
   */
  async create(data: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(data.password, saltRounds);

    return db.transaction(async (tx) => {
      const user = await tx.orm.public.User.create({
        email: data.email,
        password_hash,
        role: data.role,
      });

      if (user.role === Role.EMPLOYER) {
        await tx.orm.public.CompanyProfile.create({
          user_id: user.id,
          nome_fantasia: data.nome_fantasia ?? '',
          cnpj: data.cnpj ?? null,
          endereco: data.endereco ?? null,
          telefone: data.telefone ?? null,
        });
      } else if (user.role === Role.JOB_SEEKER) {
        await tx.orm.public.CandidateProfile.create({
          user_id: user.id,
          full_name: data.full_name ?? null,
          address: data.address ?? null,
          bio: data.bio ?? null,
          telefone: data.telefone ?? null,
        });
      }

      return user;
    });
  }

  /** Contas anteriores à criação de perfil no cadastro não têm a linha: cria vazia sob demanda. */
  async getMyCompanyProfile(userId: string) {
    const existing = await this.prisma.companyProfile.where({ user_id: userId }).first();
    if (existing) return existing;
    return this.prisma.companyProfile.create({ user_id: userId, nome_fantasia: '' });
  }

  async updateCompanyProfile(userId: string, data: UpdateCompanyProfileDto) {
    const profile = await this.getMyCompanyProfile(userId);

    return this.prisma.companyProfile.where({ id: profile.id }).update({
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Não apaga nada ainda: manda um e-mail de confirmação e só exclui de verdade quando a pessoa
   * clicar no link (ver confirmAccountDeletion). Evita exclusão por clique acidental ou sessão roubada.
   */
  async requestAccountDeletion(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.where({ id: userId }).update({
      deletion_token: token,
      deletion_token_expires_at: new Date(Date.now() + DELETION_TOKEN_TTL_MS).toISOString(),
    });

    const confirmUrl = `${process.env.FRONTEND_URL || 'https://empregasaqua.com'}/excluir-conta/confirmar?token=${token}`;
    await this.mail.send(
      user.email,
      'Confirme a exclusão da sua conta — EmpregaSaquá',
      `<p>Recebemos um pedido para excluir permanentemente sua conta no EmpregaSaquá.</p>
       <p>Essa ação remove <strong>todos</strong> os seus dados do site (perfil, vagas, candidaturas, mensagens, alertas) e não pode ser desfeita.</p>
       <p>Se foi você, confirme clicando no link abaixo (válido por 1 hora):</p>
       <p><a href="${confirmUrl}">Confirmar exclusão da conta</a></p>
       <p>Se não foi você quem pediu, ignore este e-mail — nada será excluído.</p>`,
    );

    return { message: 'Enviamos um e-mail de confirmação. Sua conta só será excluída depois que você confirmar pelo link.' };
  }

  /** Exclusão real e definitiva: apaga a linha do usuário e, por cascade, tudo que depende dela. */
  async confirmAccountDeletion(token: string) {
    const user = await this.prisma.user.where({ deletion_token: token }).first();
    if (!user || !user.deletion_token_expires_at || new Date(user.deletion_token_expires_at) < new Date()) {
      throw new BadRequestException('Link de confirmação inválido ou expirado. Peça a exclusão novamente.');
    }

    await this.prisma.user.where({ id: user.id }).delete();

    return { message: 'Sua conta e todos os dados associados foram excluídos permanentemente.' };
  }
}
