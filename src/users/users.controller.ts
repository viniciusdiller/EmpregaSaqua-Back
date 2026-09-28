import { Controller, Get, Patch, Post, Body, UseGuards, Request, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateCompanyProfileDto } from './dtos/update-company-profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/company-profile
   * Allows an Employer to read their own company profile.
   */
  @Get('company-profile')
  @Roles(Role.EMPLOYER)
  async getCompanyProfile(@Request() req: any) {
    const profile = await this.usersService.getMyCompanyProfile(req.user.id);
    if (!profile) throw new NotFoundException('Perfil de empresa não encontrado.');
    return profile;
  }

  /**
   * PATCH /users/company-profile
   * Allows an Employer to update their own company profile fields (name, address).
   */
  @Patch('company-profile')
  @Roles(Role.EMPLOYER)
  async updateCompanyProfile(@Request() req: any, @Body() dto: UpdateCompanyProfileDto) {
    return this.usersService.updateCompanyProfile(req.user.id, dto);
  }

  /**
   * POST /users/account/request-deletion
   * Envia um e-mail de confirmação; nada é excluído até o link ser confirmado
   * (ver AccountDeletionController#confirm, endpoint público).
   */
  @Post('account/request-deletion')
  @Roles(Role.EMPLOYER, Role.JOB_SEEKER)
  @HttpCode(HttpStatus.OK)
  async requestAccountDeletion(@Request() req: any) {
    return this.usersService.requestAccountDeletion(req.user.id);
  }
}
