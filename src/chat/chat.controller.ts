import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './services/chat.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.chatService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch('room/:roomId/read')
  async markRoomAsRead(@Param('roomId') roomId: string, @Req() req: any) {
    await this.chatService.markRoomAsRead(roomId, req.user.id);
    return { status: 'success' };
  }
}
