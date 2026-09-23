import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service.js';
import { PassThrough } from 'stream';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build a resume stream and output a buffer', async () => {
    const profile = {
      user: { email: 'test@example.com' },
      bio: 'Test Bio',
      telefone: '12345678',
      skills: ['Node.js', 'NestJS'],
      experiences: [
        { role: 'Dev', company: 'Tech', start_date: '2020', end_date: '2023', description: 'Code' }
      ],
      educations: [
        { degree: 'BSc', field_of_study: 'CS', institution: 'Uni', start_date: '2015', end_date: '2019' }
      ]
    };

    const stream = service.buildResumeStream(profile);
    expect(stream).toBeInstanceOf(PassThrough);

    // Consume the stream into a buffer
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic number check
    expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });
});
