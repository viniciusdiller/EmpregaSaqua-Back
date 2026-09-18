import { JobStatus } from '@prisma/client';

export class Job {
  id: string;
  employer_id: string;
  company_name: string;
  title: string;
  description: string;
  location: string;
  contact_whatsapp: string | null;
  contact_email: string | null;
  status: JobStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
