import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './services/chat.service.js';
import { JoinRoomDto } from './dtos/join-room.dto.js';
import { SendMessageDto } from './dtos/send-message.dto.js';
import { TypingDto } from './dtos/typing.dto.js';
import { EditMessageDto } from './dtos/edit-message.dto.js';
import { DeleteMessageDto } from './dtos/delete-message.dto.js';
import { Logger, HttpException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@WebSocketGateway({
  cors: {
    // Mesma lógica do main.ts: '*' só em dev, domínio fixo em produção.
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL || 'https://empregasaqua.com' : '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Rate limiting map: Map<userId, { count: number, resetTime: number }>
  private rateLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_MESSAGES = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract JWT from handshake headers or auth payload
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers['authorization']?.split(' ')[1];

      if (!token) {
        throw new Error('No authentication token provided');
      }

      const decoded = this.jwtService.verify(token);
      // O payload do JWT usa "sub" (padrão), não "id" — mesmo remapeamento que JwtStrategy#validate
      // faz pras rotas REST. Sem isso, client.data.user.id fica undefined e toda checagem de
      // participante da sala (candidate_id/employer_id !== user.id) falha sempre.
      client.data.user = { id: decoded.sub, email: decoded.email, role: decoded.role };

      this.logger.log(`Client connected: ${client.id} (User: ${decoded.email})`);
    } catch (error: any) {
      this.logger.warn(`Connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Valida o payload contra um DTO (class-validator). Mensagem de erro é sempre genérica —
   * detalhes de validação não precisam (nem devem) chegar ao cliente.
   */
  private async validatePayload<T extends object>(cls: new () => T, payload: unknown): Promise<T> {
    const instance = plainToInstance(cls, payload);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw new WsException('Dados inválidos.');
    }
    return instance;
  }

  /**
   * Erros esperados (WsException/HttpException) viram mensagem pro cliente como estão.
   * Qualquer outro erro é logado por inteiro no servidor e vira uma mensagem genérica —
   * stack traces e detalhes internos nunca saem pela rede.
   */
  private toClientError(error: unknown, fallback: string): WsException {
    if (error instanceof WsException) return error;
    if (error instanceof HttpException) return new WsException(error.message);
    this.logger.error(`Erro inesperado: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    return new WsException(fallback);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: unknown) {
    try {
      const user = client.data.user;
      if (!user) throw new WsException('Unauthorized');

      const dto = await this.validatePayload(JoinRoomDto, payload);

      // Verify and get/create room
      const room = await this.chatService.getOrCreateRoom(dto.candidateId, dto.employerId, dto.jobId);

      // Verify that the connected user is a participant
      if (room.candidate_id !== user.id && room.employer_id !== user.id) {
        throw new WsException('Forbidden: You are not a participant of this room');
      }

      // Join the socket.io room
      const roomStrId = room.id.toString();
      client.join(roomStrId);

      this.logger.log(`User ${user.id} joined room ${roomStrId}`);

      return { status: 'joined', roomId: room.id };
    } catch (error) {
      const clientError = this.toClientError(error, 'Não foi possível entrar na sala.');
      this.logger.warn(`Error joining room: ${clientError.message}`);
      throw clientError;
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: unknown) {
    const user = client.data.user;
    if (!user) throw new WsException('Unauthorized');

    // --- Rate Limiting ---
    const now = Date.now();
    const userLimit = this.rateLimits.get(user.id);

    if (userLimit && now < userLimit.resetTime) {
      if (userLimit.count >= this.MAX_MESSAGES) {
        throw new WsException('Rate limit exceeded. Please wait before sending more messages.');
      }
      userLimit.count++;
    } else {
      this.rateLimits.set(user.id, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW_MS });
    }

    try {
      const dto = await this.validatePayload(SendMessageDto, payload);

      // Save message in database (sanitization happens in ChatService)
      const message = await this.chatService.saveMessage(
        dto.roomId,
        user.id,
        dto.content,
        dto.attachmentUrl ? { url: dto.attachmentUrl, name: dto.attachmentName, type: dto.attachmentType } : undefined,
      );

      // Broadcast the message to all clients in the room
      this.server.to(dto.roomId).emit('newMessage', message);

      return { status: 'sent', messageId: message.id };
    } catch (error) {
      const clientError = this.toClientError(error, 'Não foi possível enviar a mensagem.');
      this.logger.warn(`Error sending message: ${clientError.message}`);
      throw clientError;
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: unknown) {
    const user = client.data.user;
    if (!user) throw new WsException('Unauthorized');

    try {
      const dto = await this.validatePayload(EditMessageDto, payload);
      const message = await this.chatService.editMessage(dto.messageId, user.id, dto.content);
      if (!message) throw new WsException('Mensagem não encontrada.');
      this.server.to(message.room_id).emit('messageEdited', message);
      return { status: 'edited', messageId: message.id };
    } catch (error) {
      const clientError = this.toClientError(error, 'Não foi possível editar a mensagem.');
      this.logger.warn(`Error editing message: ${clientError.message}`);
      throw clientError;
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: unknown) {
    const user = client.data.user;
    if (!user) throw new WsException('Unauthorized');

    try {
      const dto = await this.validatePayload(DeleteMessageDto, payload);
      const message = await this.chatService.deleteMessage(dto.messageId, user.id);
      if (!message) throw new WsException('Mensagem não encontrada.');
      this.server.to(message.room_id).emit('messageDeleted', { messageId: message.id, roomId: message.room_id });
      return { status: 'deleted', messageId: message.id };
    } catch (error) {
      const clientError = this.toClientError(error, 'Não foi possível apagar a mensagem.');
      this.logger.warn(`Error deleting message: ${clientError.message}`);
      throw clientError;
    }
  }

  /**
   * Indicador de "digitando…": efêmero, não é salvo. `client.rooms` só contém salas que o próprio
   * socket.io já confirmou via `join()` em handleJoinRoom, então isso também serve como checagem
   * de participação sem precisar consultar o banco de novo.
   */
  @SubscribeMessage('typing')
  async handleTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: unknown) {
    const user = client.data.user;
    if (!user) return;

    try {
      const dto = await this.validatePayload(TypingDto, payload);
      if (!client.rooms.has(dto.roomId)) return;
      client.to(dto.roomId).emit('userTyping', { roomId: dto.roomId, userId: user.id });
    } catch {
      // Evento "best-effort": payload inválido só é ignorado, nunca derruba a conexão.
    }
  }
}
