import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './services/chat.service.js';
import { ChatController } from './chat.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';

@Module({
  imports: [PrismaModule, AuthModule, UploadsModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
