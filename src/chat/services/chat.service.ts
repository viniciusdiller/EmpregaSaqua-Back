import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Com jobId: exige candidatura ativa do candidato naquela vaga (fluxo normal).
   * Sem jobId: conversa direta "banco de talentos" — qualquer empresa pode chamar qualquer
   * candidato, igual mensagem direta de LinkedIn, sem precisar de candidatura.
   * Retorna a sala existente ou cria uma nova.
   */
  async getOrCreateRoom(candidateId: string, employerId: string, jobId?: string | null) {
    if (jobId) {
      // Verify business logic: does the candidate have an application for this job?
      const application = await this.prisma.application
        .where({ applicant_id: candidateId, job_id: jobId })
        .first();

      if (!application) {
        throw new ForbiddenException('Cannot start a chat without an active application for this job.');
      }

      // Verify the job belongs to the employer
      const job = await this.prisma.job.where({ id: jobId }).first();
      if (!job || job.employer_id !== employerId) {
        throw new ForbiddenException('Invalid job or employer mismatch.');
      }
    } else {
      // Conversa direta: só confere que os dois existem e têm os papéis certos.
      const [candidate, employer] = await Promise.all([
        this.prisma.user.where({ id: candidateId }).first(),
        this.prisma.user.where({ id: employerId }).first(),
      ]);
      if (!candidate || candidate.role !== 'JOB_SEEKER' || !employer || employer.role !== 'EMPLOYER') {
        throw new ForbiddenException('Candidato ou empresa inválidos.');
      }
    }

    // Find existing room (job_id null em SQL não bate com "=", então procuramos à parte quando é direto)
    let room = jobId
      ? await this.prisma.chatRoom.where({ candidate_id: candidateId, employer_id: employerId, job_id: jobId }).first()
      : await this.prisma.chatRoom
          .where((r) => r.candidate_id.eq(candidateId))
          .where((r) => r.employer_id.eq(employerId))
          .where((r) => r.job_id.isNull())
          .first();

    // Create if not exists
    if (!room) {
      room = await this.prisma.chatRoom.create({
        candidate_id: candidateId,
        employer_id: employerId,
        job_id: jobId ?? null,
      });
    }

    return room;
  }

  /**
   * Saves a message to the database with strict XSS sanitization. A message needs text OR an
   * attachment (or both) — never neither.
   */
  async saveMessage(
    roomId: string,
    senderId: string,
    rawContent?: string,
    attachment?: { url: string; name?: string; type?: string },
  ) {
    // Sanitize message content to prevent XSS attacks when rendering in frontend
    const sanitizedContent = rawContent ? sanitizeHtml(rawContent, { allowedTags: [], allowedAttributes: {} }).trim() : '';

    if (!sanitizedContent && !attachment?.url) {
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
      ...(attachment?.url
        ? { attachment_url: attachment.url, attachment_name: attachment.name ?? null, attachment_type: attachment.type ?? null }
        : {}),
    });
  }

  /** Só quem mandou pode editar, e só se a mensagem não tiver sido apagada. */
  async editMessage(messageId: string, userId: string, rawContent: string) {
    const message = await this.prisma.message.where((m) => m.id.eq(messageId)).first();
    if (!message) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (message.sender_id !== userId) {
      throw new ForbiddenException('Você só pode editar suas próprias mensagens.');
    }
    if (message.deleted_at) {
      throw new ForbiddenException('Não é possível editar uma mensagem apagada.');
    }

    const sanitizedContent = sanitizeHtml(rawContent, { allowedTags: [], allowedAttributes: {} }).trim();
    if (!sanitizedContent) {
      throw new Error('Message content cannot be empty.');
    }

    return this.prisma.message.where({ id: messageId }).update({
      content: sanitizedContent,
      edited_at: new Date().toISOString(),
    });
  }

  /** Soft delete: zera conteúdo/anexo e marca `deleted_at`. O front mostra "Mensagem apagada". */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.where((m) => m.id.eq(messageId)).first();
    if (!message) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (message.sender_id !== userId) {
      throw new ForbiddenException('Você só pode apagar suas próprias mensagens.');
    }

    return this.prisma.message.where({ id: messageId }).update({
      content: '',
      attachment_url: null,
      attachment_name: null,
      attachment_type: null,
      deleted_at: new Date().toISOString(),
    });
  }

  /**
   * Histórico paginado: por padrão, as `limit` mensagens mais recentes. Com `before` (ISO date de
   * uma mensagem já carregada), busca a página anterior (mais antiga que o cursor) — "carregar
   * mensagens mais antigas" no front. Retorna sempre em ordem cronológica (mais antiga primeiro).
   */
  async getRoomMessages(roomId: string, userId: string, opts: { before?: string; limit?: number } = {}) {
    const room = await this.prisma.chatRoom.where((r) => r.id.eq(roomId)).first();
    if (!room || (room.candidate_id !== userId && room.employer_id !== userId)) {
      throw new ForbiddenException('Access denied to this room.');
    }

    const limit = opts.limit ?? 50;
    const base = this.prisma.message
      .where((m) => m.room_id.eq(roomId))
      .orderBy((m) => m.created_at.desc())
      .limit(limit);

    const page = await (opts.before ? base.cursor({ created_at: opts.before }) : base).all();
    return page.reverse();
  }

  /** Conversas do usuário com vaga, nome do outro lado, última mensagem e não lidas (mais recentes primeiro). */
  async getRoomsForUser(userId: string) {
    const [asCandidate, asEmployer] = await Promise.all([
      this.prisma.chatRoom.where({ candidate_id: userId }).all(),
      this.prisma.chatRoom.where({ employer_id: userId }).all(),
    ]);
    const rooms = [...new Map([...asCandidate, ...asEmployer].map((r) => [r.id, r])).values()];

    const summaries = await Promise.all(
      rooms.map(async (room) => {
        const iAmCandidate = room.candidate_id === userId;
        const [job, msgs, counterpart] = await Promise.all([
          room.job_id ? this.prisma.job.where({ id: room.job_id }).first() : Promise.resolve(null),
          this.prisma.message.where({ room_id: room.id }).all(),
          iAmCandidate
            ? this.prisma.companyProfile.where({ user_id: room.employer_id }).first()
            : this.prisma.candidateProfile.where({ user_id: room.candidate_id }).first(),
        ]);
        const sorted = msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const last = sorted[sorted.length - 1];
        let counterpart_name = 'Conversa';
        if (iAmCandidate) counterpart_name = (counterpart as any)?.nome_fantasia || 'Empresa';
        else {
          const cand: any = counterpart;
          counterpart_name = cand?.full_name || (await this.prisma.user.where({ id: room.candidate_id }).first())?.email?.split('@')[0] || 'Candidato';
        }
        return {
          id: room.id,
          job_id: room.job_id,
          candidate_id: room.candidate_id,
          employer_id: room.employer_id,
          job_title: room.job_id ? job?.title ?? 'Vaga removida' : 'Conversa direta',
          counterpart_name,
          last_message: last ? { content: last.content, created_at: last.created_at, sender_id: last.sender_id } : null,
          unread_count: msgs.filter((m) => !m.is_read && m.sender_id !== userId).length,
          _at: last ? new Date(last.created_at).getTime() : new Date(room.created_at).getTime(),
        };
      }),
    );
    return summaries.sort((a, b) => b._at - a._at).map(({ _at, ...rest }) => rest);
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
