# Project-Specific Agent Rules

These rules apply specifically to this Workspace and must be followed by all agents.

## Architecture Guidelines
- **Framework**: NestJS (Backend), Prisma (ORM), PostgreSQL (Database).
- **Architecture**: Strict separation of concerns. Controllers should only handle HTTP routing and DTO validation. Services handle business logic. Repositories handle data access.
- **Security First**: 
  - ALWAYS use `helmet()` for HTTP headers.
  - Setup CORS appropriately.
  - Implement Rate Limiting (`@nestjs/throttler`).
  - Validate and sanitize all inputs using `class-validator` and `class-transformer`.
  - Implement Role-Based Access Control (RBAC) securely using `@UseGuards(JwtAuthGuard, RolesGuard)` and the `@Roles()` decorator.
  - Handle authentication exclusively with JWT (`@nestjs/jwt`, `@nestjs/passport`). All backend routes must be verified!

## Database Management (CRITICAL: PRISMA 8)
- **Prisma 8**: This project uses Prisma 8 (`@prisma/orm-postgres`).
  - DO NOT use standard Prisma 7 methods like `.findUnique()`, `.findMany()`, `data: {}`.
  - The correct API is `.where({...}).first()` for single objects, `.all()` for arrays, and `.create({...})` directly mapping fields without the `data:` wrapper.
  - Always type your models from the generated `contract` by using `import { Scalars } from '@prisma/orm-postgres/family-contract/types'` combined with `Models.public_ModelName` (found in `db.js`/`db.ts`).
  - Never import from `@prisma/client`. Import db and types from `src/prisma/db.ts`!
- **Migrations**: Always generate migrations for schema changes before applying them using `npx prisma migrate dev`. Ensure `contract.prisma` is synced.
- **Soft Deletes**: Use the `deleted_at` field rather than permanently dropping records.

## Code Style & Formatting
- **Linting & Formatting**: Follow existing `prettier` or `oxlint` configurations if present.
- **Naming Conventions**: 
  - Controllers: `*.controller.ts`
  - Services: `*.service.ts`
  - Modules: `*.module.ts`
  - Repositories: `*.repository.ts` and `*.repository.interface.ts`
  - DTOs: `*.dto.ts`
- **Error Handling**: Use built-in NestJS exceptions (e.g., `NotFoundException`, `ConflictException`, `ForbiddenException`). Never expose raw database errors to the client.

## Testing
- **Framework**: Write E2E and Unit tests as requested.
- **Requirement**: Write unit tests for core business logic (Services/Repositories).
- **E2E Tests**: Ensure tests cover the HTTP layer and Guard validations.

## Deployment / Config
- **Environment Variables**: Use `@nestjs/config` for parsing `.env` files. Do NOT hardcode secrets.
