import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service.js';
import { ConfirmAccountDeletionDto } from './dtos/confirm-account-deletion.dto.js';

/**
 * Controller separado (sem JwtAuthGuard): o link de confirmação vem de um e-mail, então quem clica
 * pode não ter uma sessão válida no navegador. A prova de identidade aqui é o próprio token.
 */
@Controller('users/account')
export class AccountDeletionController {
  constructor(private readonly usersService: UsersService) {}

  @Post('confirm-deletion')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async confirm(@Body() dto: ConfirmAccountDeletionDto) {
    return this.usersService.confirmAccountDeletion(dto.token);
  }
}
