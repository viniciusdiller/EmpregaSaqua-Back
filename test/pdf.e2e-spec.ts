import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('PdfModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jobSeekerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);
    
    // Create job seeker
    const email = `pdfseeker_${Date.now()}@test.com`;
    const resRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'password123',
        role: 'JOB_SEEKER',
      })
      .expect(201);
      
    jobSeekerToken = resRegister.body.access_token;
    
    // Create profile
    await request(app.getHttpServer())
      .post('/candidates/profile')
      .set('Authorization', `Bearer ${jobSeekerToken}`)
      .send({
        bio: 'Backend developer',
        telefone: '123456789',
        address: 'Test City',
        skills: ['NestJS', 'PostgreSQL'],
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/candidates/resume/download (GET) - Job Seeker can download resume PDF', async () => {
    const res = await request(app.getHttpServer())
      .get('/candidates/resume/download')
      .set('Authorization', `Bearer ${jobSeekerToken}`)
      .expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment; filename="curriculo.pdf"');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(0);
  }, 15000); // Allow more time for puppeteer

  it('/candidates/resume/download (GET) - Unauthorized without token', async () => {
    await request(app.getHttpServer())
      .get('/candidates/resume/download')
      .expect(401);
  });
});
