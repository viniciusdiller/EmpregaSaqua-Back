import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { clearDatabase } from './clear-db.js';
import { Role } from '../src/prisma/db.js';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    const httpAdapter = app.getHttpAdapter().getInstance();
    if (httpAdapter && httpAdapter.set) {
      httpAdapter.set('trust proxy', 1);
    }
    await app.init();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - should register a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        role: Role.EMPLOYER,
      })
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('/auth/register (POST) - should fail if email is duplicate', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        role: Role.EMPLOYER,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        role: Role.EMPLOYER,
      })
      .expect(409);

    expect(response.body.message).toBe('Email já está em uso');
  });

  it('/auth/login (POST) - should login and return JWT', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        role: Role.EMPLOYER,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(response.body).toHaveProperty('access_token');
  });

  it('/auth/login (POST) - should fail with wrong credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        role: Role.EMPLOYER,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword!',
      })
      .expect(401);
  });

  it('/auth/login (POST) - should block brute force attempts (Rate Limiting)', async () => {
    let status = 200;
    let iterations = 0;
    
    // Loop until we get a 429
    while (status !== 429 && iterations < 10) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('x-rate-limit-test', 'true')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!',
        });
      
      status = response.status;
      iterations++;
    }

    expect(status).toBe(429);
  });
});
