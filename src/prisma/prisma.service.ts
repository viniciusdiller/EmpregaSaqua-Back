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
  public chatRoom = db.orm.public.ChatRoom;
  public message = db.orm.public.Message;
  public jobQuestion = db.orm.public.JobQuestion;
  public applicationAnswer = db.orm.public.ApplicationAnswer;
  public savedCandidate = db.orm.public.SavedCandidate;

  async onModuleInit() {
    // Connection happens automatically when querying
  }
}
