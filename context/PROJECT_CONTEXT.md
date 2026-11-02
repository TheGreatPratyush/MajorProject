# Startup-AYUSH — Project Context for Developers and LLMs

> **Purpose:** This file provides working context to a developer or AI assistant continuing the project. It records agreed decisions, technical details, current progress and next steps. It is separate from the user-facing project README.

**Last updated:** 14 November 2026  
**Project:** Startup-AYUSH Portal  
**Selected problem:** Project 175 — Startup-AYUSH Portal  
**Current phase:** Initial setup and database design  
**Status:** Prisma schema drafted in chat; local validation and migration are not yet confirmed.

---

## 1. Instructions for any LLM continuing this project

Read this file before suggesting changes or writing implementation code.

1. Keep the agreed Version 1.0 architecture unless a genuine technical blocker, security issue or explicit user decision requires a change.
2. Use **Prisma 7**. Do not give Prisma 6-era setup instructions.
3. Keep code simple, readable and easy for the student to explain to a teacher.
4. Avoid overengineering, unnecessary abstractions, extra dependencies and unrequested features.
5. Use Antigravity for implementation when the user asks. Prompts must explicitly request simple, understandable code that follows the existing design.
6. **Do not generate Antigravity prompts until the user explicitly asks.**
7. Do not claim a command, migration, test or deployment succeeded unless its output confirms success.
8. Update this file after meaningful milestones. Add a dated history entry instead of duplicating the entire history.
9. If a schema or architecture decision is unclear, ask before silently changing it.
10. Persistent application data must be stored in and retrieved from PostgreSQL through Prisma.

## 2. Project intent

Build a collaborative platform for the AYUSH ecosystem, connecting startups, investors, incubators, accelerators, mentors, government stakeholders and public users.

The platform's planned capabilities include:
- Stakeholder profiles and directories.
- Startup discovery and verification.
- Connection requests.
- Mentorship applications.
- Incubation/accelerator programs and applications.
- Resources and government schemes.
- Events and registrations.
- Community posts and comments.
- Notifications and dashboards.
- Administrative management.

## 3. Frozen Version 1.0 technical decisions

| Area | Decision |
|---|---|
| Frontend | React + Vite |
| Frontend language | JavaScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma **7** |
| Authentication | JWT + bcryptjs + server-side session records |
| Validation | Zod |
| API docs | Swagger/OpenAPI |
| API testing | Postman |
| Optional AI | External LLM API |
| PDF generation | jsPDF |
| Deployment target: frontend | Vercel |
| Deployment target: backend | Render |
| Deployment target: database | Supabase PostgreSQL |

Architecture:
- One React app.
- One Express backend.
- One PostgreSQL database.
- No microservices.
- API base path: `/api/v1`.
- Express should use routes/controllers/services/middleware/validators in a straightforward structure.
- PostgreSQL is the persistent source of truth.

Deployment platforms are targets only; they have not been configured or verified yet.

## 4. Permanent implementation preferences

### Simple, explainable code
Code should be easy to read, follow and explain. Do not add complex patterns just to make the code appear more professional. Correctness and security still matter.

### No unnecessary implementation
Only build features and files required by the agreed architecture. Avoid redundant code, duplicate helpers, unnecessary tables and unrequested features.

### Project history
Record actual progress, changed files, commands and results. Do not repeat static architecture details in every history entry.

### Antigravity
Wait for an explicit user request before writing prompts for Antigravity.

## 5. Roles

```text
STARTUP
INVESTOR
INCUBATOR
ACCELERATOR
MENTOR
GOVERNMENT
PUBLIC
ADMIN
```

Ordinary stakeholder roles may use public registration. `GOVERNMENT` and `ADMIN` accounts must be provisioned through a controlled process. Do not allow normal profile editing to change a user's role.

## 6. Planned modules

1. Authentication and authorization.
2. Stakeholder profiles.
3. Startup directory.
4. Investor directory.
5. Networking/connections.
6. Mentorship.
7. Incubation and accelerator programs.
8. Resources and government schemes.
9. Events and community.
10. Admin and verification.
11. Notifications.
12. Role-specific dashboard summaries, activity and quick stats.
13. Optional AI assistant/startup guidance/pitch review, only if time permits.

Out of scope: payments, video conferencing, native mobile app, custom-trained AI model, complex recommendation engine and real-time direct messaging. Basic posts/comments are in scope.

## 7. Database model inventory

The drafted Prisma schema contains **19 models**:

| # | Prisma model | Purpose |
|---:|---|---|
| 1 | `User` | Login identity, email, password hash, role and account status |
| 2 | `StartupProfile` | Startup details, AYUSH category, stage and verification |
| 3 | `InvestorProfile` | Investor organization, type and investment interests |
| 4 | `MentorProfile` | Mentor expertise, experience and availability |
| 5 | `IncubatorProfile` | Incubator organization and supported categories |
| 6 | `AcceleratorProfile` | Accelerator organization and specialization |
| 7 | `GovernmentProfile` | Government department and official details |
| 8 | `ConnectionRequest` | User-to-user connection requests |
| 9 | `MentorshipApplication` | Requests from applicants to mentors |
| 10 | `IncubationProgram` | Programs owned by incubators/accelerators |
| 11 | `ProgramApplication` | Startup applications to programs |
| 12 | `Resource` | Government schemes, funding, guidelines and other resources |
| 13 | `Event` | Events created by organizers |
| 14 | `EventRegistration` | User registrations for events |
| 15 | `CommunityPost` | Community posts |
| 16 | `Comment` | Comments on community posts |
| 17 | `Session` | Server-side session/token records |
| 18 | `Notification` | User notifications |
| 19 | `AuditLog` | Administrative and important action history |

The drafted schema contains **17 enums**:

```text
UserRole
UserStatus
AyushCategory
StartupStage
VerificationStatus
InvestorType
MentorAvailability
ConnectionStatus
MentorshipStatus
ProgramStatus
ProgramApplicationStatus
ResourceCategory
EventType
EventStatus
EventRegistrationStatus
PostStatus
NotificationType
```

These counts describe the schema drafted in the conversation. Verify them against the actual saved `prisma/schema.prisma` file before treating them as the final database inventory.

## 8. Important relationships in the schema

- `User` has optional one-to-one profile relations for startup, investor, mentor, incubator, accelerator and government profiles.
- `ConnectionRequest` has two relations to `User`: sender and receiver.
- `MentorshipApplication` has two relations to `User`: applicant and mentor.
- `IncubationProgram` belongs to an owner `User`.
- `ProgramApplication` connects an `IncubationProgram` to a startup `User`.
- `Resource` belongs to a publisher `User`.
- `Event` belongs to an organizer `User`.
- `EventRegistration` connects an event and a user.
- `CommunityPost` belongs to a user; `Comment` belongs to a post and a user.
- `Session` and `Notification` belong to a user.
- `AuditLog` may refer to an actor user.

## 9. Schema design and business-rule caveats

The schema draft is not yet validated. Review these points before or during implementation:

1. The database relations do not automatically guarantee that a user's `role` matches the profile table they create. Validate this in the service layer.
2. A unique `(senderId, receiverId)` constraint prevents same-direction duplicate connection requests, but not a reverse-direction duplicate pair.
3. `MentorshipApplication` currently does not have a unique applicant/mentor constraint. Decide whether repeated requests should be allowed after rejection or cancellation.
4. Event capacity checks must be safe under concurrent registrations. Use a transaction and an appropriate capacity-check strategy.
5. Validate program publication status, application deadline and applicant role in the service layer.
6. Review `onDelete` choices. Cascading deletion may remove useful history; account suspension/deactivation may be more suitable than deleting users.
7. Confirm whether PostgreSQL array fields used for interests/categories are sufficient for Version 1.0.
8. Public profile responses must not expose password hashes, session tokens or private account information.
9. Ensure only the intended recipient can accept/reject a connection and only its sender can cancel it.
10. Ensure only authorized program owners manage programs and review their applications.
11. Ensure only authorized publishers/organizers/admins manage resources and events.

## 10. Prisma 7 setup notes

The project must use Prisma 7.

The user's initial schema contained:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

The user requested CommonJS configuration. A CommonJS config draft previously supplied was:

```javascript
require("dotenv").config();

const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

**Important:** The screenshot of the user's VS Code workspace showed a file named `prisma7.config.js`. Confirm the actual filename and whether the installed Prisma CLI discovers it. Do not assume a custom filename is automatically loaded.

Prisma 7 PostgreSQL runtime configuration requires the correct PostgreSQL driver adapter when constructing Prisma Client. Confirm the installed Prisma 7 package versions and use matching adapter/client setup. Do not provide Prisma 6 initialization examples.

Do not silently change the generator or output path. Check compatibility with the installed exact Prisma 7 release first.

## 11. PostgreSQL database details

Intended local database name:

```text
ayushPortal
```

Commands previously provided to create it:

```bash
psql postgres
```

Then in the PostgreSQL prompt:

```sql
CREATE DATABASE "ayushPortal";
```

Verify:

```sql
\l
```

Connect:

```sql
\c "ayushPortal"
```

Exit:

```sql
\q
```

**Status:** The commands were provided, but successful creation has not been confirmed by user output.

Expected environment variable format:

```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/ayushPortal"
```

Use the actual local PostgreSQL credentials. Never share or commit the real `.env` file or credentials.

## 12. Repository details and `.gitignore`

A VS Code screenshot showed a workspace with these visible items:

```text
database/
  db.js
node_modules/
prisma/
.env
.gitignore
index.js
package-lock.json
package.json
prisma7.config.js
```

The screenshot also showed open editors including a Prisma config file, `schema.prisma`, `index.js` and `.env`.

The exact repository root and whether the screenshot's folder names are still current must be confirmed before moving or renaming files. Avoid unnecessary restructuring.

Suggested `.gitignore` content:

```gitignore
node_modules/

.env
.env.*
!.env.example

logs/
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

dist/
build/
coverage/

.DS_Store
Thumbs.db

.vscode/
.idea/

*.tmp
*.temp
```

Do **not** ignore:
- `prisma/schema.prisma`
- `prisma/migrations/`

Migration files must be committed so the database can be recreated in other environments. `.env` must not be committed.

The user was asked to run `git status`, but no output has been provided. Git tracking status is unknown.

## 13. Planned API areas

Base URL path: `/api/v1`.

Response convention:

Success:
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "meta": null
}
```

Error:
```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [
    { "field": "fieldName", "message": "Reason" }
  ]
}
```

Pagination baseline: `?page=1&limit=10&search=...`, default limit 10 and maximum 100.

Endpoint groups planned:
- Authentication: register, login, me, logout, change password.
- User/profile: current user, profile update, public-safe user details, stakeholder profile create/read/update.
- Startup directory: list, detail, featured, categories, visibility.
- Investor, mentor, incubator and accelerator directories.
- Connections: create/list/detail/accept/reject/cancel/accepted.
- Mentorship: list mentors, apply, list/detail requests, accept/reject/cancel/complete.
- Programs and program applications.
- Resources: list/detail/create/update/delete.
- Events: list/detail/create/update/delete/register/unregister/registrations.
- Community: posts and comments.
- Admin: dashboard, users, status changes, startup verification, reports and audit logs.
- Dashboard: summary, activity and quick stats.
- Notifications: list/read/read-all/delete.
- Optional AI endpoints if the extension is implemented.

Refer to the agreed architecture and API specification before inventing exact request/response fields or endpoint behavior.

## 14. Security baseline

- Hash passwords with bcryptjs.
- Validate inputs with Zod.
- Enforce RBAC on the backend; frontend guards are only for user experience.
- Use Helmet and rate limiting.
- Restrict CORS to known frontend origins.
- Use Prisma operations for database access.
- Centralize error handling.
- Keep secrets in environment variables.
- Do not store auth tokens in browser localStorage.
- Prefer secure HTTP-only cookies for production session/token handling, with appropriate Secure and SameSite settings.
- Support session invalidation on logout and account suspension.
- Do not expose password hashes, session tokens or private information through public API responses.
- Keep audit records for important admin actions.

## 15. Planned backend folder structure

This is a target structure, not a command to reorganize the current repository immediately:

```text
startup-ayush/
  README.md
  context/
    PROJECT_CONTEXT.md
  docs/
    01-requirements.md
    02-system-architecture.md
    03-wireframes.md
    04-database-schema.md
    05-api-contracts.md
    06-business-rules.md
    07-security-rules.md
    08-testing-plan.md
  backend/
    prisma/
      schema.prisma
      migrations/
    src/
      config/
      controllers/
      services/
      routes/
      middleware/
      validators/
      utils/
      app.js
    server.js
    .env
    package.json
  frontend/
```

Keep the existing structure if it is already working. Do not create empty folders or files just to match this diagram.

## 16. Backend completion criteria

Do not call the backend complete until:
- All agreed in-scope backend modules are implemented.
- Required endpoints work.
- Persistent data is stored and retrieved from PostgreSQL through Prisma.
- Authentication and authorization work.
- Business rules and constraints are enforced.
- Critical workflows pass end-to-end tests.
- Error handling is consistent.
- No fake success responses, hardcoded application data or placeholder endpoints remain.

## 17. Actual progress checklist

### Decisions confirmed
- [x] Selected Project 175 — Startup-AYUSH Portal.
- [x] Agreed on React + Express + PostgreSQL + Prisma architecture.
- [x] Confirmed Prisma version 7.
- [x] Chosen local database name `ayushPortal`.
- [x] Agreed database-first, Express-backend-second workflow.
- [x] Agreed on simple, explainable code.
- [x] Agreed to avoid unnecessary implementation.
- [x] Agreed to maintain a separate LLM context log.
- [x] Agreed not to generate Antigravity prompts without explicit instruction.
- [x] Drafted `.gitignore` contents.
- [x] Drafted a 19-model, 17-enum Prisma schema in the conversation.

### Not confirmed complete
- [ ] PostgreSQL database successfully created.
- [ ] Exact installed versions of `prisma` and `@prisma/client` confirmed.
- [ ] Prisma 7 config filename and discovery confirmed.
- [ ] PostgreSQL driver adapter setup confirmed.
- [ ] Saved local schema matches the draft.
- [ ] `npx prisma validate` passes.
- [ ] `npx prisma generate` succeeds.
- [ ] Initial migration succeeds.
- [ ] Tables verified in PostgreSQL.
- [ ] Express backend implemented.
- [ ] API tests completed.
- [ ] Frontend implemented.
- [ ] Deployment configured.

## 18. Immediate next steps

1. Confirm the current project root and actual file layout.
2. Run `npm list prisma @prisma/client` and inspect the installed versions.
3. Check the exact Prisma config filename and contents.
4. Confirm that PostgreSQL is running and `ayushPortal` exists.
5. Check that `.env` has the correct `DATABASE_URL` without sharing its secret value.
6. Review the drafted schema and the caveats in Section 9.
7. Save the reviewed schema to the correct `prisma/schema.prisma` location.
8. Run Prisma 7-compatible validation.
9. Generate Prisma Client.
10. Create the initial migration.
11. Verify all expected tables in PostgreSQL.
12. Record actual outputs and update this file before moving to Express implementation.

---

## 19. Append-only development history

### 2026-11-14 — Project decisions and initial database design
- **Decisions:** Selected Project 175; confirmed React, Express, PostgreSQL and Prisma 7; selected database name `ayushPortal`; agreed to database-first implementation.
- **Working rules:** Simple and explainable code, no unnecessary implementation, maintain project history, no Antigravity prompts until explicitly requested.
- **Files discussed:** `.gitignore`, `prisma/schema.prisma`, Prisma config, `.env`.
- **Work drafted:** `.gitignore` contents and an initial Prisma schema with 19 models and 17 enums.
- **Actual results:** No terminal output was shared confirming PostgreSQL creation, schema validation, Prisma Client generation or migration.
- **Current blocker/next action:** Verify local setup and validate the actual saved Prisma 7 schema before migration.

### Future entry template

Append a new entry for each meaningful work session:

```text
### YYYY-MM-DD — Short task title
- Work completed:
- Files created/changed:
- Commands run:
- Actual command results:
- Decisions made:
- Issues/blockers:
- Next step:
```

**End of current project context.**



### Current status
- Installed Express using `npm install express`.
- Configured the root `index.js` as the Express application entry point.
- Reused the existing Prisma 7 client from `database/db.js`.
- PostgreSQL connection uses `@prisma/adapter-pg`.
- Added JSON request parsing using `express.json()`.

### API endpoints
- `GET /` — Returns API running status.
- `GET /api/v1/health` — Checks PostgreSQL connectivity using Prisma `$queryRaw` with `SELECT 1`.

### Server configuration
- Port: `process.env.PORT || 5000`
- Local binding: `127.0.0.1`
- Start command: `node index.js`
- npm start script: `node index.js`

### Server startup issue and resolution
- Initial Express server exited immediately after printing its startup message.
- Minimal Express-only server remained running.
- Prisma Client and PrismaPg adapter both initialized successfully.
- The final working setup creates the server using:
  `const server = app.listen(PORT, "127.0.0.1");`
- Server event listeners were added for `listening`, `error`, and `close`.
- Explicit `server.ref()` was added to keep the server handle referenced.
- The server now remains running with Prisma imported.

### Current project structure
- `index.js` — Express application entry point.
- `database/db.js` — Prisma 7 client and PostgreSQL adapter setup.
- `prisma/schema.prisma` — Database schema.
- `prisma7.config.js` — Prisma CLI configuration.
- `context/PROJECT_CONTEXT.md` — Technical project history and LLM context.
- `README.md` — Human-facing project documentation.

### Pending verification
- Verify `GET /api/v1/health` returns successful database connectivity.
- Begin the authentication module after health-check verification.

### Important implementation note
Keep the existing CommonJS module structure. Reuse the existing Prisma client rather than creating additional PrismaClient instances.



---

## 2026-11-14 — Express Setup and Authentication Implementation

### Work completed
- Installed Express.
- Installed authentication dependencies: `bcryptjs`, `jsonwebtoken`, `zod`.
- Configured root `index.js` as the Express application entry point.
- Added JSON middleware using `express.json()`.
- Added `GET /` root endpoint.
- Added `GET /api/v1/health` for PostgreSQL connectivity using Prisma.
- Mounted authentication routes at `/api/v1/auth`.
- Resolved the Express server's immediate-exit issue using the working server startup configuration with `server.ref()`.

### Existing database connection
- Reused `database/db.js`.
- Prisma ORM 7 with PostgreSQL adapter `@prisma/adapter-pg`.
- No additional PrismaClient instance created.

### Authentication files created
- `modules/auth/auth.routes.js`
- `modules/auth/auth.controller.js`
- `modules/auth/auth.service.js`
- `modules/auth/auth.validation.js`
- `middleware/auth.middleware.js`

### Authentication functionality implemented in code
- Registration input validation using Zod.
- Login input validation using Zod.
- Password hashing using bcryptjs.
- User registration and login using Prisma.
- JWT generation and verification.
- Role-based authorization middleware.

### Authentication endpoints
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`

### Environment configuration
Added:
- `JWT_SECRET`
- `JWT_EXPIRES_IN="1d"`

Important: A generated JWT secret was exposed in chat. A fresh secret must be generated and used. Never store the actual secret in this document or commit `.env`.

### Current implementation status
- Express server startup: confirmed working by user.
- Prisma client initialization: confirmed.
- Database health endpoint response: not yet confirmed.
- Registration/login end-to-end testing: pending.
- Database-backed session persistence: pending.
- GET `/api/v1/auth/me`: pending.
- Logout: pending.
- Change password: pending.

### Important schema alignment note
The initial authentication implementation assumes these User fields:
- name
- email
- password
- role
- status

It also assumes the active status enum value is `ACTIVE`.

These assumptions must match the saved Prisma schema before treating authentication as complete.

### Next task
Complete authentication:
1. Database-backed sessions.
2. GET `/api/v1/auth/me`.
3. Logout and session invalidation.
4. Change password.

Continue using simple CommonJS code and the existing Prisma client. Avoid unnecessary files, repeated checks and duplicate implementations.
