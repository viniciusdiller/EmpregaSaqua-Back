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

      // Payload real de um JWT (sub, não id) — handleConnection remapeia pra {id,...}, igual JwtStrategy.
      const mockPayload = { sub: 'user-1', email: 'test@test.com', role: 'JOB_SEEKER' };
      (jwtService.verify as any).mockReturnValue(mockPayload);

      await gateway.handleConnection(client);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(client.data.user).toEqual({ id: 'user-1', email: 'test@test.com', role: 'JOB_SEEKER' });
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });

  const CANDIDATE_ID = '522ee529-e277-4aec-ab03-3f5e2f2d93b4';
  const EMPLOYER_ID = '91625159-d3de-489a-8507-1adb8d943738';
  const JOB_ID = '644e18b8-2701-43ca-a933-f0319e2b77f9';
  const ROOM_ID = '7332ffe0-11d0-4a9d-8d34-614f0ab7f6ac';
  const STRANGER_ID = '316ffd13-79fd-4c3b-b27a-d1c85f74d122';

  describe('handleJoinRoom', () => {
    it('should throw WsException if unauthorized (no user on socket)', async () => {
      const client = { data: {} } as any;
      await expect(
        gateway.handleJoinRoom(client, { candidateId: CANDIDATE_ID, employerId: EMPLOYER_ID, jobId: JOB_ID })
      ).rejects.toThrow(WsException);
    });

    it('should throw WsException with a generic message when the payload is malformed', async () => {
      const client = { data: { user: { id: CANDIDATE_ID } } } as any;
      await expect(
        gateway.handleJoinRoom(client, { candidateId: 'not-a-uuid', employerId: EMPLOYER_ID, jobId: JOB_ID })
      ).rejects.toThrow('Dados inválidos.');
      expect(chatService.getOrCreateRoom).not.toHaveBeenCalled();
    });

    it('should throw WsException if user is not part of the room', async () => {
      const client = { data: { user: { id: STRANGER_ID } } } as any;
      (chatService.getOrCreateRoom as any).mockResolvedValue({ id: ROOM_ID, candidate_id: CANDIDATE_ID, employer_id: EMPLOYER_ID });

      await expect(
        gateway.handleJoinRoom(client, { candidateId: CANDIDATE_ID, employerId: EMPLOYER_ID, jobId: JOB_ID })
      ).rejects.toThrow(WsException);
    });

    it('should join socket to room and return status', async () => {
      const client = { data: { user: { id: CANDIDATE_ID } }, join: vi.fn() } as any;
      (chatService.getOrCreateRoom as any).mockResolvedValue({ id: ROOM_ID, candidate_id: CANDIDATE_ID, employer_id: EMPLOYER_ID });

      const result = await gateway.handleJoinRoom(client, { candidateId: CANDIDATE_ID, employerId: EMPLOYER_ID, jobId: JOB_ID });
      expect(client.join).toHaveBeenCalledWith(ROOM_ID);
      expect(result).toEqual({ status: 'joined', roomId: ROOM_ID });
    });
  });

  describe('handleSendMessage', () => {
    it('should apply rate limiting', async () => {
      const client = { data: { user: { id: STRANGER_ID } } } as any;
      (chatService.saveMessage as any).mockResolvedValue({ id: 'msg-1' });

      // Max is 5 messages
      for (let i = 0; i < 5; i++) {
        await gateway.handleSendMessage(client, { roomId: ROOM_ID, content: 'test' });
      }

      // 6th message should throw rate limit exception
      await expect(
        gateway.handleSendMessage(client, { roomId: ROOM_ID, content: 'test' })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw WsException with a generic message when the payload is malformed', async () => {
      const client = { data: { user: { id: CANDIDATE_ID } } } as any;
      await expect(
        gateway.handleSendMessage(client, { roomId: 'not-a-uuid', content: 'hello' })
      ).rejects.toThrow('Dados inválidos.');
      expect(chatService.saveMessage).not.toHaveBeenCalled();
    });

    it('should broadcast message to room', async () => {
      const client = { data: { user: { id: CANDIDATE_ID } } } as any;
      const savedMessage = { id: 'msg-1', content: 'hello' };
      (chatService.saveMessage as any).mockResolvedValue(savedMessage);

      const emitMock = vi.fn();
      (gateway.server.to as any).mockReturnValue({ emit: emitMock });

      const result = await gateway.handleSendMessage(client, { roomId: ROOM_ID, content: 'hello' });

      expect(chatService.saveMessage).toHaveBeenCalledWith(ROOM_ID, CANDIDATE_ID, 'hello', undefined);
      expect(gateway.server.to).toHaveBeenCalledWith(ROOM_ID);
      expect(emitMock).toHaveBeenCalledWith('newMessage', savedMessage);
      expect(result).toEqual({ status: 'sent', messageId: 'msg-1' });
    });
  });
});
