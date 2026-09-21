import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as sanitizeHtml from 'sanitize-html';

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
      .where((a) => a.applicant_id.eq(candidateId).and(a.job_id.eq(jobId)))
      .first();

    if (!application) {
      throw new ForbiddenException('Cannot start a chat without an active application for this job.');
    }

    // 2. Verify the job belongs to the employer
    const job = await this.prisma.job.where((j) => j.id.eq(jobId)).first();
    if (!job || job.employer_id !== employerId) {
      throw new ForbiddenException('Invalid job or employer mismatch.');
    }

    // 3. Find existing room
    let room = await this.prisma.chatRoom
      .where((r) => 
        r.candidate_id.eq(candidateId)
        .and(r.employer_id.eq(employerId))
        .and(r.job_id.eq(jobId))
      )
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
}
