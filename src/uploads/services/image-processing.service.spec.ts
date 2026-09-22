import { Test, TestingModule } from '@nestjs/testing';
import { UnsupportedMediaTypeException } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import sharp from 'sharp';

// Mock node:fs/promises and sharp to avoid real disk I/O in unit tests
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sharp', () => {
  const chain = {
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-webp')),
  };
  return { default: vi.fn(() => chain) };
});

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessingService],
    }).compile();

    service = module.get<ImageProcessingService>(ImageProcessingService);
    vi.clearAllMocks();
  });

  // ─── processAndSaveImage ────────────────────────────────────────────────────────

  describe('processAndSaveImage', () => {
    const validBuffer = Buffer.from('fake-image-data');

    it('should process a JPEG and return a .webp URL', async () => {
      const result = await service.processAndSaveImage(validBuffer, 'image/jpeg', 'test');

      expect(result.url).toMatch(/^\/uploads\/logos\/.+\.webp$/);
      expect(result.filename).toMatch(/\.webp$/);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it('should process a PNG and return a .webp URL', async () => {
      const result = await service.processAndSaveImage(validBuffer, 'image/png', 'test');

      expect(result.url).toMatch(/^\/uploads\/logos\/.+\.webp$/);
    });

    it('should process a WebP image without error', async () => {
      await expect(service.processAndSaveImage(validBuffer, 'image/webp', 'test')).resolves.not.toThrow();
    });

    it('should call sharp with resize 800x800 inside and webp quality 80', async () => {
      await service.processAndSaveImage(validBuffer, 'image/jpeg', 'test');

      const sharpInstance = (sharp as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(sharpInstance.resize).toHaveBeenCalledWith({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(sharpInstance.webp).toHaveBeenCalledWith({ quality: 80 });
    });

    it('should call fs.mkdir to ensure the output directory exists', async () => {
      await service.processAndSaveImage(validBuffer, 'image/jpeg', 'test');
      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('logos'), { recursive: true });
    });

    it('should call fs.writeFile to persist the processed buffer', async () => {
      await service.processAndSaveImage(validBuffer, 'image/jpeg', 'test');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.webp'),
        expect.any(Buffer),
      );
    });

    it('should throw UnsupportedMediaTypeException for PDF', async () => {
      await expect(service.processAndSaveImage(validBuffer, 'application/pdf', 'test')).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should throw UnsupportedMediaTypeException for text/plain', async () => {
      await expect(service.processAndSaveImage(validBuffer, 'text/plain', 'test')).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
    });

    it('should generate a unique filename on each call', async () => {
      const r1 = await service.processAndSaveImage(validBuffer, 'image/png', 'test');
      const r2 = await service.processAndSaveImage(validBuffer, 'image/png', 'test');

      expect(r1.filename).not.toBe(r2.filename);
    });
  });
});
