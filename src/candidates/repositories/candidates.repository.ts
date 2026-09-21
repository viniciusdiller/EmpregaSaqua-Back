import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CandidateProfile, db } from '../../prisma/db.js';
import { or } from '@prisma/orm-postgres/orm-client';
import { SearchCandidatesDto } from '../dtos/search-candidates.dto.js';

@Injectable()
export class CandidatesRepository {
  constructor(private prisma: PrismaService) {}

  async searchCandidates(searchDto: SearchCandidatesDto) {
    const { skills, role, location, page = 1, limit = 10 } = searchDto;
    
    // Base query using Prisma 8 where() 
    let query = this.prisma.candidateProfile.where({});

    // Filtering by location (ilike match on address)
    if (location) {
      query = query.where((c) => c.address.ilike(`%${location}%`));
    }

    // Filtering by skills using raw SQL to find IDs
    if (skills) {
      const skillsArray = skills.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      if (skillsArray.length > 0) {
        // Since Prisma 8 Postgres text-array fields do not currently expose
        // native array intersection operators on the field proxy, and raw SQL
        // interpolation of arrays requires internal codecs, we fetch the candidate
        // skills and perform the intersection in memory to find the matching IDs.
        const allCandidates = await db.orm.public.CandidateProfile.select('id', 'skills').all();
        
        const ids = allCandidates
          .filter((c) => {
            // Check if any of the candidate's skills match any of the requested skills (case-insensitive)
            return skillsArray.some((requestedSkill) =>
              c.skills.some((candidateSkill) =>
                candidateSkill.toLowerCase().includes(requestedSkill.toLowerCase())
              )
            );
          })
          .map((c) => c.id);
        
        if (ids.length === 0) {
          // If no candidates match the skills, short-circuit and return empty
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
        
        // Add the in-clause to the query
        query = query.where((c) => c.id.in(ids));
      }
    }

    // Filtering by role in Experience
    if (role) {
      query = query.where((c) =>
        c.experiences.some((e) => e.role.ilike(`%${role}%`))
      );
    }

    // Get total count
    const { total } = await query.aggregate((a) => ({ total: a.count() }));

    // Get paginated results
    const results = await query
      .include('user', (u) => u.select('id', 'email'))
      .include('experiences')
      .include('educations')
      .offset((page - 1) * limit)
      .limit(limit)
      .all();

    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
