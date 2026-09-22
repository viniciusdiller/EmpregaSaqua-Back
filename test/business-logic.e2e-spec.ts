import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { clearDatabase } from './clear-db.js';
import { db, VerificationStatus, ApplicationStatus } from '../src/prisma/db.js';
import * as path from 'path';
import * as fs from 'fs';

describe('Business Logic & Edge Cases (e2e)', () => {
  let app: INestApplication;
  let employerToken: string;
  let seekerToken: string;
  let employerId: string;
  let seekerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Setup Employer
    await request(app.getHttpServer()).post('/auth/register').send({ email: 'employer_biz@test.com', password: 'Password123!', role: 'EMPLOYER' });
    const empLogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'employer_biz@test.com', password: 'Password123!' });
    employerToken = empLogin.body.access_token;
    
    const empUser = await db.orm.public.User.first({ email: 'employer_biz@test.com' });
    employerId = empUser!.id;
    await db.orm.public.CompanyProfile.create({
      user_id: employerId,
      nome_fantasia: 'Business Corp',
      verification_status: VerificationStatus.APPROVED,
    });

    // Setup Seeker
    await request(app.getHttpServer()).post('/auth/register').send({ email: 'seeker_biz@test.com', password: 'Password123!', role: 'JOB_SEEKER' });
    const seekerLogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'seeker_biz@test.com', password: 'Password123!' });
    seekerToken = seekerLogin.body.access_token;
    
    const seekerUser = await db.orm.public.User.first({ email: 'seeker_biz@test.com' });
    seekerId = seekerUser!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Match Score (Fuzzy Matching): Should give high score for "reactjs" & "nest.js" vs "React.js" & "NestJS"', async () => {
    // Seeker skills
    await db.orm.public.CandidateProfile.create({
      user_id: seekerId,
      bio: 'Dev',
      skills: ['reactjs', 'nest.js'] // Lowercase/punctuation differences
    });

    // Employer creates job with exact case
    const jobRes = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Fullstack Dev',
        description: 'React and Nest',
        address: 'Remote',
        work_schedule: 'Flexible',
        mandatory_qualifications: ['React.js', 'NestJS'],
        work_model: 'ON_SITE',
        contract_type: 'CLT',
        differential_qualifications: [],
        benefits: [],
      });
    const jobId = jobRes.body.id;
    await db.orm.public.Job.where({ id: jobId }).update({ status: 'ACTIVE' });

    // Seeker applies
    await request(app.getHttpServer())
      .post(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ cover_letter: 'Hello' });

    // Employer fetches applications and checks match_score
    const appsRes = await request(app.getHttpServer())
      .get(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);

    expect(appsRes.body.length).toBe(1);
    const score = appsRes.body[0].match_score;
    // We expect fuzzy matching to give a very high score (close to 100, > 80 minimum)
    expect(score).toBeGreaterThan(80);
  });

  it('2. Knockout Questions: Should initially set status to REJECTED if answer is wrong', async () => {
    const jobRes = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Driver',
        description: 'Need CNH',
        address: 'Local',
        work_schedule: 'Fixed',
        mandatory_qualifications: [],
        work_model: 'ON_SITE',
        contract_type: 'CLT',
        differential_qualifications: [],
        benefits: [],
        questions: [{ question_text: 'Possui CNH B ativa?', expected_answer: true }]
      });
    const jobId = jobRes.body.id;
    await db.orm.public.Job.where({ id: jobId }).update({ status: 'ACTIVE' });

    // Job gets created, now we need to fetch the question_id
    const dbJob = await db.orm.public.Job.where({ id: jobId }).include('questions').first();
    const questionId = dbJob!.questions[0].id;

    // Seeker applies with wrong answer
    const applyRes = await request(app.getHttpServer())
      .post(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        cover_letter: 'I want to drive',
        answers: [{ question_id: questionId, answer: false }]
      })
      .expect(201);

    expect(applyRes.body.status).toBe(ApplicationStatus.REJECTED);
  });

  it('3. Talent Pool (Unique Constraint): Should return 409 Conflict when saving same candidate twice', async () => {
    // Add first time
    await request(app.getHttpServer())
      .post('/talent-pool')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ candidate_id: seekerId, notes: 'Good dev' })
      .expect(201);

    // Try adding again
    const res = await request(app.getHttpServer())
      .post('/talent-pool')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ candidate_id: seekerId, notes: 'Duplicate' })
      .expect(409); // Validating HTTP Conflict, not a 500 error!

    expect(res.body.message).toContain('já está salvo no seu banco de talentos');
  });

  it('4. Upload Security: Should throw 415 Unsupported Media Type for .txt files', async () => {
    // Create a dummy .txt file
    const txtPath = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(txtPath, 'This is a text file, not an image.');

    const res = await request(app.getHttpServer())
      .post('/uploads/logo')
      .set('Authorization', `Bearer ${employerToken}`)
      .attach('file', txtPath)
      .expect(415); // Unsupported Media Type

    expect(res.body.message).toContain('Tipo de arquivo não suportado');
    
    // Cleanup
    fs.unlinkSync(txtPath);
  });
  
  it('4b. Upload Security: Should throw 413 Payload Too Large for big images', async () => {
    // Create a dummy image > 2MB (just a large buffer passed as file)
    const largeBuffer = Buffer.alloc(3 * 1024 * 1024, 'a'); // 3MB
    
    const res = await request(app.getHttpServer())
      .post('/uploads/logo')
      .set('Authorization', `Bearer ${employerToken}`)
      .attach('file', largeBuffer, 'large_image.jpg')
      .expect(413); // Payload Too Large
      
    expect(res.body.message).toContain('excede o tamanho máximo');
  });
});
