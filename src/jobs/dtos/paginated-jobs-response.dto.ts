import type { Job } from '../../prisma/db.js';

export interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

export interface PaginatedJobsResponse {
  data: Job[];
  meta: PaginationMeta;
}
