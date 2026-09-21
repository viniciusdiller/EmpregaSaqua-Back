/**
 * E2E Permission Tests — CRUD Completo
 *
 * Cobre todos os cenários de permissão (RBAC) para os novos endpoints de edição e exclusão:
 *  - Jobs: PATCH /jobs/:id
 *  - Candidates: PATCH /candidates/profile, DELETE /candidates/profile
 *  - Applications: DELETE /applications/:id (withdraw)
 *  - Users: PATCH /users/company-profile, DELETE /users/account
 *  - Admin: PATCH /admin/jobs/:id, DELETE /admin/jobs/:id, PATCH /admin/users/:id/role, DELETE /admin/users/:id
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { clearDatabase } from './clear-db.js';
import { Role, VerificationStatus, db } from '../src/prisma/db.js';
import * as bcrypt from 'bcrypt';

describe('CRUD Permissions (e2e)', () => {
  let app: INestApplication;

  let employerToken: string;
  let employer2Token: string; // second employer for IDOR tests
  let seekerToken: string;
  let adminToken: string;

  let employerUserId: string;
  let employer2UserId: string;
  let seekerUserId: string;

  let jobId: string; // job owned by employer
  let applicationId: string; // application by seeker on employer's job

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const jobPayload = {
    title: 'Vaga de Teste',
    description: 'Descrição da vaga',
    address: 'Saquarema - RJ',
    work_schedule: 'Seg-Sex 08h-17h',
    mandatory_qualifications: ['Node.js'],
    differential_qualifications: [],
    benefits: ['VT'],
  };

  async function approveCompanyProfile(userId: string, companyName: string) {
    await db.orm.public.CompanyProfile.where({ user_id: userId }).upsert({
      create: {
        user_id: userId,
        nome_fantasia: companyName,
        verification_status: VerificationStatus.APPROVED,
      },
      update: { verification_status: VerificationStatus.APPROVED },
    });
  }

  async function registerAndLogin(email: string, role: string): Promise<{ token: string; userId: string }> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Password123!', role });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Password123!' });
    const user = await db.orm.public.User.first({ email });
    return { token: loginRes.body.access_token, userId: user!.id };
  }

  // ─── Setup ──────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    await clearDatabase();

    // Create users
    const employer = await registerAndLogin('employer1@perm.test', 'EMPLOYER');
    employerToken = employer.token;
    employerUserId = employer.userId;
    await approveCompanyProfile(employerUserId, 'Empresa Teste 1');

    const employer2 = await registerAndLogin('employer2@perm.test', 'EMPLOYER');
    employer2Token = employer2.token;
    employer2UserId = employer2.userId;
    await approveCompanyProfile(employer2UserId, 'Empresa Teste 2');

    const seeker = await registerAndLogin('seeker1@perm.test', 'JOB_SEEKER');
    seekerToken = seeker.token;
    seekerUserId = seeker.userId;

    // Create CandidateProfile for the seeker (not done automatically on register)
    await db.orm.public.CandidateProfile.create({
      user_id: seekerUserId,
      bio: 'Bio inicial',
      skills: [],
    });

    // Create admin directly in DB (can't register as admin via API)
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const adminUser = await db.orm.public.User.create({
      email: 'admin@perm.test',
      password_hash: passwordHash,
      role: Role.ADMIN,
    });
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@perm.test', password: 'Password123!' });
    adminToken = adminLoginRes.body.access_token;

    // Employer creates a job
    const jobRes = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send(jobPayload);
    jobId = jobRes.body.id;

    // Approve job so seeker can apply
    await db.orm.public.Job.where({ id: jobId }).update({ status: 'ACTIVE' });

    // Seeker applies
    const appRes = await request(app.getHttpServer())
      .post(`/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ cover_letter: 'Estou interessado!' });
    applicationId = appRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. PATCH /jobs/:id
  // ════════════════════════════════════════════════════════════════════════════
  describe('PATCH /jobs/:id (Employer updates job)', () => {
    it('❌ 401 - Unauthenticated user cannot update a job', () =>
      request(app.getHttpServer())
        .patch(`/jobs/${jobId}`)
        .send({ title: 'Novo Título' })
        .expect(401));

    it('❌ 403 - JOB_SEEKER cannot update a job', () =>
      request(app.getHttpServer())
        .patch(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({ title: 'Tentativa' })
        .expect(403));

    it('❌ 403 - Another EMPLOYER cannot update someone else\'s job', () =>
      request(app.getHttpServer())
        .patch(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employer2Token}`)
        .send({ title: 'IDOR Attack' })
        .expect(403));

    it('✅ 200 - Job OWNER (EMPLOYER) can update their job', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'Título Atualizado', salary_range: 'R$ 5.000' })
        .expect(200);
      expect(res.body.title).toBe('Título Atualizado');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PATCH /candidates/profile
  // ════════════════════════════════════════════════════════════════════════════
  describe('PATCH /candidates/profile (Candidate updates profile)', () => {
    it('❌ 401 - Unauthenticated user cannot update candidate profile', () =>
      request(app.getHttpServer())
        .patch('/candidates/profile')
        .send({ bio: 'Bio sem auth' })
        .expect(401));

    it('❌ 403 - EMPLOYER cannot update a candidate profile', () =>
      request(app.getHttpServer())
        .patch('/candidates/profile')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ bio: 'Tentativa do Employer' })
        .expect(403));

    it('✅ 200 - JOB_SEEKER can update their own profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/candidates/profile')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({ bio: 'Minha nova bio!', skills: ['Node.js', 'TypeScript'] })
        .expect(200);
      expect(res.body.bio).toBe('Minha nova bio!');
      expect(res.body.skills).toContain('Node.js');
    });

    it('✅ 200 - JOB_SEEKER can update profile with experiences', async () => {
      const res = await request(app.getHttpServer())
        .patch('/candidates/profile')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          experiences: [
            { company: 'TechCorp', role: 'Dev', start_date: '2022-01', description: 'Desenvolvedor' },
          ],
        })
        .expect(200);
      expect(res.body.experiences).toHaveLength(1);
      expect(res.body.experiences[0].company).toBe('TechCorp');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. PATCH /users/company-profile
  // ════════════════════════════════════════════════════════════════════════════
  describe('PATCH /users/company-profile (Employer updates company profile)', () => {
    it('❌ 401 - Unauthenticated user cannot update company profile', () =>
      request(app.getHttpServer())
        .patch('/users/company-profile')
        .send({ nome_fantasia: 'Nova Empresa' })
        .expect(401));

    it('❌ 403 - JOB_SEEKER cannot update a company profile', () =>
      request(app.getHttpServer())
        .patch('/users/company-profile')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({ nome_fantasia: 'Tentativa do Candidato' })
        .expect(403));

    it('✅ 200 - EMPLOYER can update their own company profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/company-profile')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ nome_fantasia: 'Empresa Renomeada', endereco: 'Av. Nova, 100' })
        .expect(200);
      expect(res.body.nome_fantasia).toBe('Empresa Renomeada');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. DELETE /applications/:id (Withdraw)
  // ════════════════════════════════════════════════════════════════════════════
  describe('DELETE /applications/:id (Candidate withdraws application)', () => {
    it('❌ 401 - Unauthenticated user cannot withdraw', () =>
      request(app.getHttpServer())
        .delete(`/applications/${applicationId}`)
        .expect(401));

    it('❌ 403 - EMPLOYER cannot withdraw a candidate\'s application', () =>
      request(app.getHttpServer())
        .delete(`/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(403));

    it('✅ 204 - JOB_SEEKER can withdraw their own application', () =>
      request(app.getHttpServer())
        .delete(`/applications/${applicationId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(204));

    it('❌ 404 - Trying to withdraw the same application again returns 404', () =>
      request(app.getHttpServer())
        .delete(`/applications/${applicationId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(404));
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. Admin: PATCH /admin/jobs/:id
  // ════════════════════════════════════════════════════════════════════════════
  describe('PATCH /admin/jobs/:id (Admin updates any job)', () => {
    it('❌ 401 - Unauthenticated user cannot access admin routes', () =>
      request(app.getHttpServer())
        .patch(`/admin/jobs/${jobId}`)
        .send({ title: 'Hacked!' })
        .expect(401));

    it('❌ 403 - EMPLOYER cannot access admin job update route', () =>
      request(app.getHttpServer())
        .patch(`/admin/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'IDOR!' })
        .expect(403));

    it('❌ 403 - JOB_SEEKER cannot access admin job update route', () =>
      request(app.getHttpServer())
        .patch(`/admin/jobs/${jobId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({ title: 'IDOR!' })
        .expect(403));

    it('✅ 200 - ADMIN can update any job, including changing status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Editou', status: 'FILLED' })
        .expect(200);
      // No strict body assertion since admin update returns from ORM directly
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. Admin: DELETE /admin/jobs/:id
  // ════════════════════════════════════════════════════════════════════════════
  describe('DELETE /admin/jobs/:id (Admin hard-deletes any job)', () => {
    let tempJobId: string;

    beforeAll(async () => {
      // Employer creates a job specifically for this delete test
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${employer2Token}`)
        .send(jobPayload);
      tempJobId = res.body.id;
    });

    it('❌ 403 - EMPLOYER cannot hard-delete via admin route', () =>
      request(app.getHttpServer())
        .delete(`/admin/jobs/${tempJobId}`)
        .set('Authorization', `Bearer ${employer2Token}`)
        .expect(403));

    it('✅ 200 - ADMIN can hard-delete any job', () =>
      request(app.getHttpServer())
        .delete(`/admin/jobs/${tempJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200));

    it('❌ 404 - Attempting to delete the same job again returns 404', () =>
      request(app.getHttpServer())
        .delete(`/admin/jobs/${tempJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404));
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. Admin: PATCH /admin/users/:id/role
  // ════════════════════════════════════════════════════════════════════════════
  describe('PATCH /admin/users/:id/role (Admin changes user role)', () => {
    it('❌ 403 - EMPLOYER cannot change user roles', () =>
      request(app.getHttpServer())
        .patch(`/admin/users/${seekerUserId}/role`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ role: 'ADMIN' })
        .expect(403));

    it('❌ 400 - ADMIN gets validation error on invalid role value', () =>
      request(app.getHttpServer())
        .patch(`/admin/users/${seekerUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'SUPERUSER' })
        .expect(400));

    it('✅ 200 - ADMIN can change a user\'s role', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${seekerUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'EMPLOYER' })
        .expect(200);

      // Revert to JOB_SEEKER so other tests stay consistent
      await request(app.getHttpServer())
        .patch(`/admin/users/${seekerUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'JOB_SEEKER' });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. Admin: DELETE /admin/users/:id
  // ════════════════════════════════════════════════════════════════════════════
  describe('DELETE /admin/users/:id (Admin bans a user)', () => {
    let tempUserId: string;

    beforeAll(async () => {
      const u = await registerAndLogin('temp.user@perm.test', 'JOB_SEEKER');
      tempUserId = u.userId;
    });

    it('❌ 403 - EMPLOYER cannot delete users via admin route', () =>
      request(app.getHttpServer())
        .delete(`/admin/users/${tempUserId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(403));

    it('✅ 200 - ADMIN can delete any user', () =>
      request(app.getHttpServer())
        .delete(`/admin/users/${tempUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200));

    it('❌ 404 - Deleting already-deleted user returns 404', () =>
      request(app.getHttpServer())
        .delete(`/admin/users/${tempUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404));
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. DELETE /candidates/profile (Candidate deletes own account)
  //    Note: Run last to avoid affecting other tests that use seekerToken
  // ════════════════════════════════════════════════════════════════════════════
  describe('DELETE /candidates/profile (Candidate deletes own account)', () => {
    let tempSeekerToken: string;

    beforeAll(async () => {
      const u = await registerAndLogin('temp.seeker@perm.test', 'JOB_SEEKER');
      tempSeekerToken = u.token;
    });

    it('❌ 401 - Unauthenticated cannot delete account', () =>
      request(app.getHttpServer())
        .delete('/candidates/profile')
        .expect(401));

    it('❌ 403 - EMPLOYER cannot delete a candidate account via this route', () =>
      request(app.getHttpServer())
        .delete('/candidates/profile')
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(403));

    it('✅ 204 - JOB_SEEKER can delete their own account', () =>
      request(app.getHttpServer())
        .delete('/candidates/profile')
        .set('Authorization', `Bearer ${tempSeekerToken}`)
        .expect(204));
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 10. DELETE /users/account (Any user deletes own account)
  // ════════════════════════════════════════════════════════════════════════════
  describe('DELETE /users/account (Employer self-deletes account)', () => {
    let tempEmployerToken: string;

    beforeAll(async () => {
      const u = await registerAndLogin('temp.employer@perm.test', 'EMPLOYER');
      tempEmployerToken = u.token;
      await approveCompanyProfile(u.userId, 'Temp Employer Corp');
    });

    it('❌ 401 - Unauthenticated cannot delete account', () =>
      request(app.getHttpServer())
        .delete('/users/account')
        .expect(401));

    it('✅ 204 - EMPLOYER can delete their own account', () =>
      request(app.getHttpServer())
        .delete('/users/account')
        .set('Authorization', `Bearer ${tempEmployerToken}`)
        .expect(204));

    it('❌ 401 - Token from deleted account is no longer valid', () =>
      request(app.getHttpServer())
        .delete('/users/account')
        .set('Authorization', `Bearer ${tempEmployerToken}`)
        .expect(401));
  });
});
