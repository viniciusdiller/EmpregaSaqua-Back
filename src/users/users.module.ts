import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AccountDeletionController } from './account-deletion.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [forwardRef(() => AuthModule), MailModule],
  controllers: [UsersController, AccountDeletionController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
