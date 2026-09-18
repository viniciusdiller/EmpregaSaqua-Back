import { Injectable, OnModuleInit } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleInit {
  public user = db.orm.public.User;
  public job = db.orm.public.Job;

  async onModuleInit() {
    // Connection happens automatically when querying
  }
}
