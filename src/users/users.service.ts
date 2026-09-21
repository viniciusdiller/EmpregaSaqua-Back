import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateCompanyProfileDto } from './dtos/update-company-profile.dto.js';
import { User } from '../prisma/db.js';
import * as bcrypt from 'bcrypt';

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
    // Cascade deletes all related data (company profile, jobs, etc.)
    return this.prisma.user.where({ id: userId }).delete();
  }
}

