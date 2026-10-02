import { Controller, Get, Patch, Post, Param, Query, UseGuards, UseInterceptors, Req, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { ChatService } from './services/chat.service.js';
import { ChatGateway } from './chat.gateway.js';
import { GetMessagesDto } from './dtos/get-messages.dto.js';
import { ChatAttachmentInterceptor } from './interceptors/chat-attachment.interceptor.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ImageProcessingService } from '../uploads/services/image-processing.service.js';
import { DocumentProcessingService } from '../uploads/services/document-processing.service.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly documentProcessingService: DocumentProcessingService,
  ) {}

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.chatService.getUnreadCount(req.user.id);
    return { count };
  }

  @Get('rooms')
  async getRooms(@Req() req: any) {
    return this.chatService.getRoomsForUser(req.user.id);
  }

  @Get('room/:roomId/messages')
  async getMessages(@Param('roomId') roomId: string, @Query() query: GetMessagesDto, @Req() req: any) {
    return this.chatService.getRoomMessages(roomId, req.user.id, { before: query.before, limit: query.limit });
  }

  @Patch('room/:roomId/read')
  async markRoomAsRead(@Param('roomId') roomId: string, @Req() req: any) {
    await this.chatService.markRoomAsRead(roomId, req.user.id);
    // Avisa o outro lado em tempo real (sem isso, "visto" só atualizaria no próximo refetch).
    this.chatGateway.server?.to(roomId).emit('messagesRead', { roomId, readBy: req.user.id });
    return { status: 'success' };
  }

  /**
   * POST /chat/attachments — sobe o arquivo (imagem ou PDF) e devolve a URL pública.
   * Não manda a mensagem: o front usa a URL no payload de `sendMessage` pelo socket.
   */
  @Post('attachments')
  @UseInterceptors(ChatAttachmentInterceptor)
  async uploadAttachment(@Req() req: Request) {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado. Envie o campo "file".');
    }

    const isImage = file.mimetype.startsWith('image/');
    const result = isImage
      ? await this.imageProcessingService.processAndSaveImage(file.buffer, file.mimetype, 'chat', 'ChatAnexos')
      : await this.documentProcessingService.processAndSaveDocument(file.buffer, file.mimetype, 'chat', 'ChatAnexos');

    return {
      url: result.url,
      filename: result.filename,
      size_bytes: result.sizeBytes,
      type: isImage ? 'image' : 'document',
    };
  }
}
