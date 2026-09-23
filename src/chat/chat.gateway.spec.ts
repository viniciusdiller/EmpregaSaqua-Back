import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './services/chat.service.js';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { vi } from 'vitest';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: {
            getOrCreateRoom: vi.fn(),
            saveMessage: vi.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: vi.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get<ChatService>(ChatService);
    jwtService = module.get<JwtService>(JwtService);
    
    // Mock server
    gateway.server = {
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should disconnect if no token provided', async () => {
      const client = {
        handshake: { auth: {}, headers: {} },
        disconnect: vi.fn(),
        id: 'client-1',
      } as any;

      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should connect and decode token successfully', async () => {
      const client = {
        handshake: { auth: { token: 'valid-token' }, headers: {} },
        disconnect: vi.fn(),
        id: 'client-1',
        data: {},
      } as any;

      const mockPayload = { id: 'user-1', email: 'test@test.com' };
      (jwtService.verify as any).mockReturnValue(mockPayload);

      await gateway.handleConnection(client);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(client.data.user).toEqual(mockPayload);
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinRoom', () => {
    it('should throw WsException if unauthorized (no user on socket)', async () => {
      const client = { data: {} } as any;
      await expect(
        gateway.handleJoinRoom(client, { candidateId: 'c1', employerId: 'e1', jobId: 'j1' })
      ).rejects.toThrow(WsException);
    });

    it('should throw WsException if user is not part of the room', async () => {
      const client = { data: { user: { id: 'stranger' } } } as any;
      (chatService.getOrCreateRoom as any).mockResolvedValue({ id: 'r1', candidate_id: 'c1', employer_id: 'e1' });

      await expect(
        gateway.handleJoinRoom(client, { candidateId: 'c1', employerId: 'e1', jobId: 'j1' })
      ).rejects.toThrow(WsException);
    });

    it('should join socket to room and return status', async () => {
      const client = { data: { user: { id: 'c1' } }, join: vi.fn() } as any;
      (chatService.getOrCreateRoom as any).mockResolvedValue({ id: 'r1', candidate_id: 'c1', employer_id: 'e1' });

      const result = await gateway.handleJoinRoom(client, { candidateId: 'c1', employerId: 'e1', jobId: 'j1' });
      expect(client.join).toHaveBeenCalledWith('r1');
      expect(result).toEqual({ status: 'joined', roomId: 'r1' });
    });
  });

  describe('handleSendMessage', () => {
    it('should apply rate limiting', async () => {
      const client = { data: { user: { id: 'spammer' } } } as any;
      (chatService.saveMessage as any).mockResolvedValue({ id: 'msg-1' });

      // Max is 5 messages
      for (let i = 0; i < 5; i++) {
        await gateway.handleSendMessage(client, { roomId: 'r1', content: 'test' });
      }

      // 6th message should throw rate limit exception
      await expect(
        gateway.handleSendMessage(client, { roomId: 'r1', content: 'test' })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should broadcast message to room', async () => {
      const client = { data: { user: { id: 'c1' } } } as any;
      const savedMessage = { id: 'msg-1', content: 'hello' };
      (chatService.saveMessage as any).mockResolvedValue(savedMessage);

      const emitMock = vi.fn();
      (gateway.server.to as any).mockReturnValue({ emit: emitMock });

      const result = await gateway.handleSendMessage(client, { roomId: 'r1', content: 'hello' });
      
      expect(chatService.saveMessage).toHaveBeenCalledWith('r1', 'c1', 'hello');
      expect(gateway.server.to).toHaveBeenCalledWith('r1');
      expect(emitMock).toHaveBeenCalledWith('newMessage', savedMessage);
      expect(result).toEqual({ status: 'sent', messageId: 'msg-1' });
    });
  });
});
