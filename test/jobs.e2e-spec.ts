import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { clearDatabase } from './clear-db.js';
import { Role } from '../src/prisma/db.js';

describe('JobsModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  const getEmployerToken = async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'employer@test.com',
      password: 'Password123!',
      role: 'EMPLOYER',
    });
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'employer@test.com',
      password: 'Password123!',
    });
    return res.body.access_token;
  };

  const getSeekerToken = async () => {
    const reg = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'seeker@test.com',
      password: 'Password123!',
      role: 'JOB_SEEKER',
    });
    if (reg.status !== 201) console.error('Seeker register error:', reg.body);
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'seeker@test.com',
      password: 'Password123!',
    });
    if (res.status !== 200) console.error('Seeker login error:', res.body);
    return res.body.access_token;
  };

  it('/jobs (POST) - should fail without auth (401)', async () => {
    await request(app.getHttpServer())
      .post('/jobs')
      .send({
        title: 'Developer',
        description: 'Test job description',
        address: 'Saquarema',
        work_schedule: 'Test Schedule',
        salary_range: 'Test Range',
        mandatory_qualifications: ['Q1'],
        differential_qualifications: ['D1'],
        benefits: ['B1'],
      })
      .expect(401);
  });

  it('/jobs (POST) - should fail if role is JOB_SEEKER (403)', async () => {
    const seekerToken = await getSeekerToken();
    
    await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        title: 'Vaga Teste',
        description: 'Desc',
        address: 'Test Address',
        work_schedule: 'Test Schedule',
        salary_range: 'Test Range',
        mandatory_qualifications: ['Q1'],
        differential_qualifications: ['D1'],
        benefits: ['B1'],
      })
      .expect(403);
  });

  it('/jobs (POST) - should create job if role is EMPLOYER (201)', async () => {
    const employerToken = await getEmployerToken();
    
    const response = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Vaga Teste',
        description: 'Desc',
        address: 'Test Address',
        work_schedule: 'Test Schedule',
        salary_range: 'Test Range',
        mandatory_qualifications: ['Q1'],
        differential_qualifications: ['D1'],
        benefits: ['B1'],
      })
      .expect(201);
      
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Vaga Teste');
  });

  it('/jobs/:id (DELETE) - should soft delete job if owner', async () => {
    const employerToken = await getEmployerToken();
    
    const createRes = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Developer',
        description: 'Test job description',
        address: 'Saquarema',
        work_schedule: 'Test Schedule',
        salary_range: 'Test Range',
        mandatory_qualifications: ['Q1'],
        differential_qualifications: ['D1'],
        benefits: ['B1'],
      })
      .expect(201);
      
    const jobId = createRes.body.id;
    
    await request(app.getHttpServer())
      .delete(`/jobs/${jobId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);
      
    // Ideally we would query the database here to ensure deleted_at is set,
    // or provide a GET /jobs/:id and verify it returns 404 or filters it out.
  });
});
