import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensures the candidate and employer have a valid connection (an application exists).
   * Returns the chat room or creates it if it doesn't exist yet.
   */
  async getOrCreateRoom(candidateId: string, employerId: string, jobId: string) {
    // 1. Verify business logic: does the candidate have an application for this job?
    const application = await this.prisma.application
      .where({ applicant_id: candidateId, job_id: jobId })
      .first();

    if (!application) {
      throw new ForbiddenException('Cannot start a chat without an active application for this job.');
    }

    // 2. Verify the job belongs to the employer
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job || job.employer_id !== employerId) {
      throw new ForbiddenException('Invalid job or employer mismatch.');
    }

    // 3. Find existing room
    let room = await this.prisma.chatRoom
      .where({
        candidate_id: candidateId,
        employer_id: employerId,
        job_id: jobId,
      })
      .first();

    // 4. Create if not exists
    if (!room) {
      room = await this.prisma.chatRoom.create({
        candidate_id: candidateId,
        employer_id: employerId,
        job_id: jobId,
      });
    }

    return room;
  }

  /**
   * Saves a message to the database with strict XSS sanitization.
   */
  async saveMessage(roomId: string, senderId: string, rawContent: string) {
    // Sanitize message content to prevent XSS attacks when rendering in frontend
    const sanitizedContent = sanitizeHtml(rawContent, { allowedTags: [], allowedAttributes: {} });

    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      throw new Error('Message content cannot be empty.');
    }

    // Verify room exists and user is part of it
    const room = await this.prisma.chatRoom.where((r) => r.id.eq(roomId)).first();
    if (!room) {
      throw new NotFoundException('Chat room not found.');
    }

    if (room.candidate_id !== senderId && room.employer_id !== senderId) {
      throw new ForbiddenException('You are not a participant in this room.');
    }

    return this.prisma.message.create({
      room_id: roomId,
      sender_id: senderId,
      content: sanitizedContent,
    });
  }

  /**
   * Fetch chat history
   */
  async getRoomMessages(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.where((r) => r.id.eq(roomId)).first();
    if (!room || (room.candidate_id !== userId && room.employer_id !== userId)) {
      throw new ForbiddenException('Access denied to this room.');
    }

    return this.prisma.message
      .where((m) => m.room_id.eq(roomId))
      // Prisma 8 orderBy requires db.sql or wait, orderBy is via methods?
      // Actually we will just fetch all and sort in memory if needed, or rely on created_at order natively.
      // We will sort them in memory just to be safe if order method is complex
      .all()
      .then(msgs => msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
  }

  /**
   * Get unread messages count for a user across all their rooms
   */
  async getUnreadCount(userId: string): Promise<number> {
    const candidateRooms = await this.prisma.chatRoom.where({ candidate_id: userId }).all();
    const employerRooms = await this.prisma.chatRoom.where({ employer_id: userId }).all();
    const userRooms = [...candidateRooms, ...employerRooms];
    
    const roomIds = [...new Set(userRooms.map(r => r.id))];
    if (roomIds.length === 0) return 0;

    let count = 0;
    for (const id of roomIds) {
      const unreadMsgs = await this.prisma.message.where({ room_id: id, is_read: false }).all();
      count += unreadMsgs.filter(m => m.sender_id !== userId).length;
    }

    return count;
  }

  /**
   * Mark all unread messages in a room as read
   */
  async markRoomAsRead(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.chatRoom.where({ id: roomId }).first();
    if (!room || (room.candidate_id !== userId && room.employer_id !== userId)) {
      throw new ForbiddenException('Access denied to this room.');
    }

    const unreadMessages = await this.prisma.message.where({ room_id: roomId, is_read: false }).all();
    const toUpdate = unreadMessages.filter(m => m.sender_id !== userId);

    for (const msg of toUpdate) {
      await this.prisma.message.where({ id: msg.id }).update({ is_read: true });
    }
  }
}
