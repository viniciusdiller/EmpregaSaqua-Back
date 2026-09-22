import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { CandidatesModule } from './candidates/candidates.module.js';
import { PdfModule } from './pdf/pdf.module.js';
import { ChatModule } from './chat/chat.module.js';
import { AdminModule } from './admin/admin.module.js';
import { TalentPoolModule } from './talent-pool/talent-pool.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuditLogInterceptor } from './audit/interceptors/audit-log.interceptor.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Serve ./uploads as static files at /uploads/*
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    JobsModule,
    ApplicationsModule,
    UploadsModule,
    AnalyticsModule,
    CandidatesModule,
    PdfModule,
    ChatModule,
    AdminModule,
    TalentPoolModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    JwtAuthGuard,
  ],
})
export class AppModule {}

