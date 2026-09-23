import { Test, TestingModule } from '@nestjs/testing';
import { AuditCleanupService } from './audit-cleanup.service.js';
import { db } from '../../prisma/db.js';
import { vi } from 'vitest';
import * as fs from 'fs';
import * as zlib from 'zlib';

vi.mock('fs');
vi.mock('zlib');

describe('AuditCleanupService', () => {
  let service: AuditCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditCleanupService],
    }).compile();

    service = module.get<AuditCleanupService>(AuditCleanupService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupOldLogs', () => {
    it('should archive and delete logs older than 90 days', async () => {
      const mockLogs = [{ id: '1', action: 'POST' }];
      const mockDelete = vi.fn().mockResolvedValue({ count: 1 });
      const mockAll = vi.fn().mockResolvedValue(mockLogs);
      
      const mockWhere = vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue({ 
        all: mockAll,
        delete: mockDelete 
      } as any);

      // Mock fs
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockWriteStream = {
        on: vi.fn((event, callback) => {
          if (event === 'finish') callback();
          return mockWriteStream;
        })
      };
      vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockWriteStream as any);

      // Mock zlib
      const mockGzip = {
        on: vi.fn(),
        pipe: vi.fn(),
        write: vi.fn(),
        end: vi.fn()
      };
      vi.spyOn(zlib, 'createGzip').mockReturnValue(mockGzip as any);

      await service.cleanupOldLogs();

      expect(mockAll).toHaveBeenCalled();
      expect(fs.createWriteStream).toHaveBeenCalled();
      expect(zlib.createGzip).toHaveBeenCalled();
      expect(mockGzip.pipe).toHaveBeenCalledWith(mockWriteStream);
      expect(mockGzip.write).toHaveBeenCalledWith(JSON.stringify(mockLogs, null, 2));
      expect(mockDelete).toHaveBeenCalled(); // Only called after finish
    });

    it('should skip if no logs exist', async () => {
      const mockAll = vi.fn().mockResolvedValue([]);
      vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue({ all: mockAll } as any);
      
      const loggerSpy = vi.spyOn(service['logger'], 'log');
      await service.cleanupOldLogs();

      expect(loggerSpy).toHaveBeenCalledWith('Nenhum log antigo para limpar.');
      expect(fs.createWriteStream).not.toHaveBeenCalled();
    });

    it('should not delete if compression fails', async () => {
      const mockLogs = [{ id: '1', action: 'POST' }];
      const mockDelete = vi.fn();
      const mockAll = vi.fn().mockResolvedValue(mockLogs);
      vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue({ 
        all: mockAll,
        delete: mockDelete 
      } as any);

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockWriteStream = {
        on: vi.fn((event, callback) => {
          if (event === 'error') callback(new Error('Write error'));
          return mockWriteStream;
        })
      };
      vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockWriteStream as any);
      
      const mockGzip = {
        on: vi.fn(), pipe: vi.fn(), write: vi.fn(), end: vi.fn()
      };
      vi.spyOn(zlib, 'createGzip').mockReturnValue(mockGzip as any);

      await service.cleanupOldLogs();

      expect(mockDelete).not.toHaveBeenCalled(); // Critical check!
    });
  });
});
