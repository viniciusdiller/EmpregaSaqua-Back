import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateCompanyProfileDto } from './dtos/update-company-profile.dto.js';
import { User, db } from '../prisma/db.js';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.where({ email }).first();
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.where({ id }).first();
  }

  async create(data: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(data.password, saltRounds);

    return this.prisma.user.create({
      email: data.email,
      password_hash,
      role: data.role,
    });
  }

  async updateCompanyProfile(userId: string, data: UpdateCompanyProfileDto) {
    const profile = await this.prisma.companyProfile.where({ user_id: userId }).first();
    if (!profile) throw new NotFoundException('Perfil de empresa não encontrado.');

    return this.prisma.companyProfile.where({ id: profile.id }).update({
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  async deleteAccount(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (user.deleted_at) throw new UnauthorizedException('Token inválido');

    return db.transaction(async (tx) => {
      const now = new Date().toISOString();
      const fakeUuid = randomUUID();
      const fakeEmail = `anon_${fakeUuid}@deleted.local`;

      // Update User
      await tx.orm.public.User.where({ id: userId }).update({
        email: fakeEmail,
        password_hash: '',
        deleted_at: now,
      });

      // Clear CompanyProfile if exists
      const company = await tx.orm.public.CompanyProfile.where({ user_id: userId }).first();
      if (company) {
        await tx.orm.public.CompanyProfile.where({ id: company.id }).update({
          nome_fantasia: 'Usuário Anonimizado',
          cnpj: null,
          endereco: null,
          logo_url: null,
          verification_document_url: null,
        });
      }

      // Clear CandidateProfile if exists
      const candidate = await tx.orm.public.CandidateProfile.where({ user_id: userId }).first();
      if (candidate) {
        await tx.orm.public.CandidateProfile.where({ id: candidate.id }).update({
          bio: null,
          telefone: null,
          habilidades: null,
          skills: [],
          address: null,
        });
      }

      return { message: 'Conta excluída (anonimizada) com sucesso.' };
    });
  }
}
