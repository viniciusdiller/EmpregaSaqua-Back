import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { clearDatabase } from './clear-db.js';
import { db, VerificationStatus } from '../src/prisma/db.js';

describe('CandidatesModule (e2e)', () => {
  let app: INestApplication;

  let employerToken: string;
  let seekerToken: string;
  let seekerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true, // Crucial for SearchCandidatesDto
      }),
    );
    await app.init();
  });

  beforeEach(async () => {
    await clearDatabase();

    // 1. Create Employer
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'employer@emp.com', password: 'password', role: 'EMPLOYER' });
    const empLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'employer@emp.com', password: 'password' });
    employerToken = empLogin.body.access_token;

    // Approve employer so they can (potentially) use other endpoints, though Candidates GET might just need JWT
    const empUser = await db.orm.public.User.first({ email: 'employer@emp.com' });
    if (empUser) {
      await db.orm.public.CompanyProfile.where({ user_id: empUser.id }).upsert({
        create: {
          user_id: empUser.id,
          nome_fantasia: 'Test Company',
          verification_status: VerificationStatus.APPROVED,
        },
        update: {
          verification_status: VerificationStatus.APPROVED,
        },
      });
    }

    // 2. Create Job Seeker
    const seekerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'seeker@emp.com', password: 'password', role: 'JOB_SEEKER' });
    seekerId = seekerReg.body.user.id;
    
    const seekerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'seeker@emp.com', password: 'password' });
    seekerToken = seekerLogin.body.access_token;

    // Setup candidate profile and experience for the seeker manually since we don't have endpoints for it yet
    await db.orm.public.CandidateProfile.create({
      user_id: seekerId,
      bio: 'Sou um dev backend',
      skills: ['Node.js', 'NestJS', 'Prisma'],
      address: 'Saquarema - RJ',
    });

    const cp = await db.orm.public.CandidateProfile.first({ user_id: seekerId });
    if (cp) {
      await db.orm.public.Experience.create({
        candidate_id: cp.id,
        company: 'Tech Corp',
        role: 'Senior Backend Engineer',
        start_date: '2020-01-01',
        description: 'Desenvolvimento de APIs REST',
      });
      
      await db.orm.public.Education.create({
        candidate_id: cp.id,
        institution: 'Universidade X',
        degree: 'Bacharel',
        field_of_study: 'Ciência da Computação',
        start_date: '2015-01-01',
        end_date: '2019-12-31'
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('/candidates (GET) - Job Seeker cannot search (403)', async () => {
    await request(app.getHttpServer())
      .get('/candidates')
      .set('Authorization', `Bearer ${seekerToken}`)
      .expect(403);
  });

  it('/candidates (GET) - Employer can search without filters', async () => {
    const res = await request(app.getHttpServer())
      .get('/candidates')
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('/candidates (GET) - Employer can filter by skill', async () => {
    const res = await request(app.getHttpServer())
      .get('/candidates?skills=NestJS')
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].skills).toContain('NestJS');
  });

  it('/candidates (GET) - Employer can filter by role in experience', async () => {
    const res = await request(app.getHttpServer())
      .get('/candidates?role=Backend')
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].experiences[0].role).toContain('Backend');
  });

  it('/candidates (GET) - Employer can filter by location', async () => {
    const res = await request(app.getHttpServer())
      .get('/candidates?location=Saquarema')
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].address).toContain('Saquarema');
  });

  it('/candidates (GET) - Returns empty if no match', async () => {
    const res = await request(app.getHttpServer())
      .get('/candidates?skills=Java')
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);

    expect(res.body.data.length).toBe(0);
    expect(res.body.total).toBe(0);
  });
});
