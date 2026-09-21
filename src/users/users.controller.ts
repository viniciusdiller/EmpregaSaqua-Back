import { Controller, Patch, Delete, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
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
   * PATCH /users/company-profile
   * Allows an Employer to update their own company profile fields (name, address).
   */
  @Patch('company-profile')
  @Roles(Role.EMPLOYER)
  async updateCompanyProfile(@Request() req: any, @Body() dto: UpdateCompanyProfileDto) {
    return this.usersService.updateCompanyProfile(req.user.id, dto);
  }

  /**
   * DELETE /users/account
   * Allows any authenticated user (Employer or Candidate) to delete their own account.
   * This triggers a cascade delete on all related data.
   */
  @Delete('account')
  @Roles(Role.EMPLOYER, Role.JOB_SEEKER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Request() req: any): Promise<void> {
    await this.usersService.deleteAccount(req.user.id);
  }
}
