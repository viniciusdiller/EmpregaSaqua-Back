import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { clearDatabase } from './clear-db';
import { JobStatus, ApplicationStatus, VerificationStatus, db } from '../src/prisma/db.js';

describe('ApplicationsController (e2e)', () => {
  let app: INestApplication;

  let employerToken: string;
  let seekerToken: string;
  let jobId: string;
  let applicationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    await clearDatabase();

    // 1. Create Employer
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'employer@emp.com', password: 'password', role: 'EMPLOYER' });
    const empLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'employer@emp.com', password: 'password' });
    employerToken = empLogin.body.access_token;

    // Automatically create and approve the employer for tests to pass VerifiedEmployerGuard
    const user = await db.orm.public.User.first({ email: 'employer@emp.com' });
    if (user) {
      await db.orm.public.CompanyProfile.where({ user_id: user.id }).upsert({
        create: {
          user_id: user.id,
          nome_fantasia: 'Test Company',
          verification_status: VerificationStatus.APPROVED,
        },
        update: {
          verification_status: VerificationStatus.APPROVED,
        },
      });
    }

    // 2. Create Job Seeker
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'seeker@emp.com', password: 'password', role: 'JOB_SEEKER' });
    const seekerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'seeker@emp.com', password: 'password' });
    seekerToken = seekerLogin.body.access_token;

    // 3. Employer creates a job
    const jobRes = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Backend Dev',
        description: 'Node.js needed',
        address: 'Test Address',
        work_schedule: 'Test Schedule',
        salary_range: 'Test Range',
        mandatory_qualifications: ['Q1'],
        differential_qualifications: ['D1'],
        benefits: ['B1'],
      });
    jobId = jobRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/jobs/:id/applications (POST) - Employer cannot apply', async () => {
    return request(app.getHttpServer())
      .post(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ cover_letter: 'I am the boss' })
      .expect(403);
  });

  it('/jobs/:id/applications (POST) - Job Seeker can apply', async () => {
    const response = await request(app.getHttpServer())
      .post(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ cover_letter: 'Hire me please', resume_url: 'http://linkedin.com/me' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe(ApplicationStatus.PENDING);
    expect(response.body.job_id).toBe(jobId);
    
    applicationId = response.body.id;
  });

  it('/jobs/:id/applications (POST) - Job Seeker cannot apply twice', async () => {
    return request(app.getHttpServer())
      .post(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ cover_letter: 'Again' })
      .expect(409);
  });

  it('/jobs/:id/applications (GET) - Job Seeker cannot view applications', async () => {
    return request(app.getHttpServer())
      .get(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .expect(403);
  });

  it('/jobs/:id/applications (GET) - Employer can view applications for their job', async () => {
    const response = await request(app.getHttpServer())
      .get(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(1);
    expect(response.body[0].id).toBe(applicationId);
  });

  it('/applications (GET) - Job Seeker can view their applications', async () => {
    const response = await request(app.getHttpServer())
      .get('/applications')
      .set('Authorization', `Bearer ${seekerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(1);
    expect(response.body[0].job_id).toBe(jobId);
  });

  it('/applications/:id/status (PATCH) - Employer can update status', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ status: ApplicationStatus.ACCEPTED })
      .expect(200);

    expect(response.body.status).toBe(ApplicationStatus.ACCEPTED);
  });
});
