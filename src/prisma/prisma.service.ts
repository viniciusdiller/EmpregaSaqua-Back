import { Injectable, OnModuleInit } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleInit {
  public user = db.orm.public.User;
  public job = db.orm.public.Job;
  public application = db.orm.public.Application;
  public companyProfile = db.orm.public.CompanyProfile;
  public candidateProfile = db.orm.public.CandidateProfile;
  public experience = db.orm.public.Experience;
  public education = db.orm.public.Education;

  async onModuleInit() {
    // Connection happens automatically when querying
  }
}
