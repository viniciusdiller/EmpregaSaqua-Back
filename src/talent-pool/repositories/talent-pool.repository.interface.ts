import type { FieldOutputTypes } from '../../prisma/contract.d.js';
type SavedCandidate = FieldOutputTypes['public']['SavedCandidate'];

export interface TalentPoolRepository {
  create(employerId: string, candidateId: string, notes?: string): Promise<SavedCandidate>;
  findByEmployer(employerId: string, page: number, limit: number): Promise<{ data: SavedCandidate[]; total: number }>;
  findByEmployerAndCandidate(employerId: string, candidateId: string): Promise<SavedCandidate | null>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<SavedCandidate | null>;
}
