# Project-Specific Agent Rules

These rules apply specifically to this Workspace and must be followed by all agents.

## Architecture Guidelines
- **Framework**: NestJS (Backend), Prisma (ORM), PostgreSQL (Database).
- **Architecture**: Strict separation of concerns. Controllers should only handle HTTP routing and DTO validation. Services handle business logic. Repositories (or Prisma Services acting as repositories) handle data access.
- **Security First**: 
  - ALWAYS use `helmet()` for HTTP headers.
  - Setup CORS appropriately.
  - Implement Rate Limiting (`@nestjs/throttler`).
  - Validate and sanitize all inputs (class-validator, class-transformer, sanitize-html).
  - Implement Role-Based Access Control (RBAC) securely using Guards.
  - Handle authentication exclusively with JWT (`@nestjs/jwt`, `@nestjs/passport`).

## Code Style & Formatting
- **Linting & Formatting**: Follow `oxlint` and `prettier` rules.
- **Naming Conventions**: 
  - Controllers: `*.controller.ts`
  - Services: `*.service.ts`
  - Modules: `*.module.ts`
  - DTOs: `*.dto.ts`
  - Entities/Models: Defined via Prisma schema, but DTOs should reflect clear interfaces.
- **Error Handling**: Use built-in NestJS exceptions (e.g., `NotFoundException`, `BadRequestException`). Never expose raw database errors to the client.

## Testing
- **Framework**: `vitest` for both unit and E2E testing.
- **Requirement**: Write unit tests for all core business logic (Services). Include E2E tests for critical paths (e.g., Authentication, Job Posting).

## Database Management
- **Prisma**: Do not write raw SQL unless absolutely necessary.
- **Migrations**: Always generate migrations for schema changes before applying them (`prisma migrate dev`).

## Deployment / Config
- **Environment Variables**: Use `@nestjs/config` for parsing `.env` files. Do NOT hardcode secrets.
- **Soft Deletes**: Use the `deleted_at` field implemented in the Prisma schema to filter out deleted records rather than permanently dropping them.
