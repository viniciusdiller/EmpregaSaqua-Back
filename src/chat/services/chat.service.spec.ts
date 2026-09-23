import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: {
            application: {
              where: vi.fn(),
            },
            job: {
              where: vi.fn(),
            },
            chatRoom: {
              where: vi.fn(),
              create: vi.fn(),
            },
            message: {
              create: vi.fn(),
              where: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateRoom', () => {
    it('should throw ForbiddenException if no application exists', async () => {
      const mockWhere = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) });
      (prisma.application.where as any) = mockWhere;

      await expect(
        service.getOrCreateRoom('cand-1', 'emp-1', 'job-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockWhere).toHaveBeenCalledWith({ applicant_id: 'cand-1', job_id: 'job-1' });
    });

    it('should throw ForbiddenException if job does not belong to employer', async () => {
      (prisma.application.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'app-1' }) });
      
      const mockJobWhere = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'job-1', employer_id: 'other-emp' }) });
      (prisma.job.where as any) = mockJobWhere;

      await expect(
        service.getOrCreateRoom('cand-1', 'emp-1', 'job-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return existing room if found', async () => {
      (prisma.application.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'app-1' }) });
      (prisma.job.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'job-1', employer_id: 'emp-1' }) });
      
      const existingRoom = { id: 'room-1', candidate_id: 'cand-1', employer_id: 'emp-1', job_id: 'job-1' };
      (prisma.chatRoom.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(existingRoom) });

      const result = await service.getOrCreateRoom('cand-1', 'emp-1', 'job-1');
      expect(result).toEqual(existingRoom);
      expect(prisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('should create and return room if not found', async () => {
      (prisma.application.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'app-1' }) });
      (prisma.job.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'job-1', employer_id: 'emp-1' }) });
      (prisma.chatRoom.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) });
      
      const newRoom = { id: 'room-2', candidate_id: 'cand-1', employer_id: 'emp-1', job_id: 'job-1' };
      (prisma.chatRoom.create as any).mockResolvedValue(newRoom);

      const result = await service.getOrCreateRoom('cand-1', 'emp-1', 'job-1');
      expect(result).toEqual(newRoom);
      expect(prisma.chatRoom.create).toHaveBeenCalledWith({
        candidate_id: 'cand-1',
        employer_id: 'emp-1',
        job_id: 'job-1',
      });
    });
  });

  describe('saveMessage', () => {
    it('should throw Error if content is empty or only bad tags', async () => {
      // Empty content
      await expect(service.saveMessage('room-1', 'user-1', '   ')).rejects.toThrow('Message content cannot be empty.');
      
      // XSS completely stripped
      await expect(service.saveMessage('room-1', 'user-1', '<script>alert(1)</script>')).rejects.toThrow('Message content cannot be empty.');
    });

    it('should throw NotFoundException if room does not exist', async () => {
      const mockWhere = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) });
      (prisma.chatRoom.where as any) = mockWhere;

      await expect(
        service.saveMessage('room-1', 'user-1', 'Hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if sender is not in the room', async () => {
      (prisma.chatRoom.where as any) = vi.fn().mockReturnValue({ 
        first: vi.fn().mockResolvedValue({ id: 'room-1', candidate_id: 'cand-1', employer_id: 'emp-1' }) 
      });

      await expect(
        service.saveMessage('room-1', 'stranger', 'Hello'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should sanitize content and save message', async () => {
      (prisma.chatRoom.where as any) = vi.fn().mockReturnValue({ 
        first: vi.fn().mockResolvedValue({ id: 'room-1', candidate_id: 'cand-1', employer_id: 'emp-1' }) 
      });
      
      const createdMessage = { id: 'msg-1', room_id: 'room-1', sender_id: 'cand-1', content: 'Safe text' };
      (prisma.message.create as any).mockResolvedValue(createdMessage);

      const result = await service.saveMessage('room-1', 'cand-1', '<b>Safe text</b><script>bad</script>');
      
      expect(result).toEqual(createdMessage);
      expect(prisma.message.create).toHaveBeenCalledWith({
        room_id: 'room-1',
        sender_id: 'cand-1',
        content: 'Safe text', // sanitizeHtml strips the entire <script>bad</script> tag
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return 0 if user has no rooms', async () => {
      const mockRoomsWhere = vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue([]) });
      (prisma.chatRoom.where as any) = mockRoomsWhere;

      const count = await service.getUnreadCount('user-1');
      expect(count).toBe(0);
    });

    it('should return the count of unread messages from other senders', async () => {
      (prisma.chatRoom.where as any) = vi.fn().mockReturnValue({ 
        all: vi.fn().mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]) 
      });

      const mockMessagesWhere = vi.fn().mockReturnValue({ 
        all: vi.fn().mockResolvedValue([{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]) 
      });
      (prisma.message.where as any) = mockMessagesWhere;

      const count = await service.getUnreadCount('user-1');
      
      expect(count).toBe(6);
      expect(prisma.message.where).toHaveBeenCalled(); // verified indirectly that it gets called
    });
  });

  describe('markRoomAsRead', () => {
    it('should throw ForbiddenException if room not found or user not participant', async () => {
      (prisma.chatRoom.where as any) = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) });

      await expect(service.markRoomAsRead('r1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should update all unread messages in the room sent by others', async () => {
      (prisma.chatRoom.where as any) = vi.fn().mockReturnValue({ 
        first: vi.fn().mockResolvedValue({ id: 'r1', candidate_id: 'u1', employer_id: 'e1' }) 
      });

      (prisma.message.where as any) = vi.fn().mockReturnValue({ 
        all: vi.fn().mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]),
        update: vi.fn().mockResolvedValue({})
      });

      await service.markRoomAsRead('r1', 'u1');

      // message.where is called to fetch unread messages, and then called in the loop to update
      expect(prisma.message.where).toHaveBeenCalled();
    });
  });
});
