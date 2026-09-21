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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Set to actual frontend domain in production
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  
  // Rate limiting map: Map<userId, { count: number, resetTime: number }>
  private rateLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_MESSAGES = 10;
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
      client.data.user = decoded; // Store user payload in socket
      
      this.logger.log(`Client connected: ${client.id} (User: ${decoded.email})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { candidateId: string; employerId: string; jobId: string }
  ) {
    try {
      const user = client.data.user;
      if (!user) throw new WsException('Unauthorized');

      // Verify and get/create room
      const room = await this.chatService.getOrCreateRoom(
        payload.candidateId, 
        payload.employerId, 
        payload.jobId
      );

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
      this.logger.error(`Error joining room: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; content: string }
  ) {
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
      // Save message in database (sanitization happens in ChatService)
      const message = await this.chatService.saveMessage(
        payload.roomId,
        user.id,
        payload.content
      );

      // Broadcast the message to all clients in the room
      this.server.to(payload.roomId).emit('newMessage', message);
      
      return { status: 'sent', messageId: message.id };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw new WsException(error.message);
    }
  }
}
