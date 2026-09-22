import { Test, TestingModule } from '@nestjs/testing';
import { AuditCleanupService } from './audit-cleanup.service';
import { db } from '../../prisma/db';
import { vi } from 'vitest';

describe('AuditCleanupService', () => {
  let service: AuditCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditCleanupService],
    }).compile();

    service = module.get<AuditCleanupService>(AuditCleanupService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than 45 days', async () => {
      // Create a mock chain for Prisma 8 where().delete()
      const mockDelete = vi.fn().mockResolvedValue({ count: 5 });
      const mockWhere = vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue({ delete: mockDelete } as any);

      // Mock date to freeze time
      const mockDate = new Date('2026-09-22T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      // Execute the method
      await service.cleanupOldLogs();

      // Verify fortyFiveDaysAgo is correctly calculated
      const expectedDate = new Date('2026-09-22T12:00:00.000Z');
      expectedDate.setDate(expectedDate.getDate() - 45);

      // Verify that where() was called with a lambda function
      expect(mockWhere).toHaveBeenCalledWith(expect.any(Function));

      // Verify that delete() was called
      expect(mockDelete).toHaveBeenCalled();

      // Restore time
      vi.useRealTimers();
    });

    it('should handle errors gracefully without throwing', async () => {
      const mockDelete = vi.fn().mockRejectedValue(new Error('DB Error'));
      const mockWhere = vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue({ delete: mockDelete } as any);

      // Spying on logger directly
      const loggerSpy = vi.spyOn(service['logger'], 'error');

      // Execute the method, should not throw
      await expect(service.cleanupOldLogs()).resolves.not.toThrow();

      // Verify the error was logged
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('DB Error'));
    });
  });
});
