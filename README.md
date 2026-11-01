# Startup-AYUSH Portal

A collaborative digital platform designed to connect stakeholders across India's AYUSH ecosystem.

> **Project status:** Initial setup and database design stage. The Prisma schema has been drafted, but validation, migration, and backend implementation are not yet confirmed complete.

## 1. Project overview

The Startup-AYUSH Portal aims to bring together startups, investors, incubators, accelerators, mentors, government stakeholders, and public users in one place.

The platform is intended to make it easier for AYUSH ecosystem participants to discover relevant organizations, connect with one another, find mentorship and incubation opportunities, access useful resources, and participate in events and community activities.

**Selected problem statement:** Project 175 — Startup-AYUSH Portal.

## 2. Goals

- Create a common platform for AYUSH ecosystem stakeholders.
- Help users discover AYUSH startups and supporting organizations.
- Enable networking and connection requests.
- Support mentorship requests between startups/users and mentors.
- Publish incubation and accelerator programs and accept applications.
- Provide access to government schemes, guidelines, funding and other resources.
- Publish events and manage registrations.
- Provide a basic community space for posts and comments.
- Give administrators tools to manage users and verify relevant profiles.

## 3. User roles

| Role | Intended use |
|---|---|
| `STARTUP` | Create a startup profile, discover opportunities, connect and apply to programs |
| `INVESTOR` | Publish an investor profile and discover startups |
| `INCUBATOR` | Publish incubation programs and review applications |
| `ACCELERATOR` | Publish accelerator programs and review applications |
| `MENTOR` | Publish expertise and respond to mentorship requests |
| `GOVERNMENT` | Share official resources and relevant information |
| `PUBLIC` | Browse public information and participate in permitted platform activities |
| `ADMIN` | Manage users, verification and platform content |

Ordinary users may register through the public registration flow. Government and admin accounts are intended to be provisioned through a controlled process rather than freely selected during public registration.

## 4. Main features

### Public discovery
- Browse AYUSH startups.
- View public startup profiles.
- Browse investors, incubators, accelerators and mentors.
- Browse resources and events.

### Profiles
- Create and update a role-specific stakeholder profile.
- Display public-safe profile information.
- Support startup verification status.

### Networking
- Send and receive connection requests.
- Accept, reject or cancel requests according to permissions.
- View accepted connections.

### Mentorship
- Browse mentors.
- Submit mentorship requests.
- Allow mentors to accept, reject or complete requests.

### Programs and applications
- Allow incubators and accelerators to create programs.
- Publish and close programs.
- Allow startups to apply.
- Allow program owners to review applications.

### Resources
- Publish government schemes, funding information, regulatory guidelines, research and educational resources.
- Browse and view resource details.

### Events
- Publish events.
- Allow users to register or cancel registration.
- Enforce event capacity and registration rules.

### Community
- Create community posts.
- Comment on posts.
- Allow owners and administrators to moderate permitted content.

### Administration
- Manage user status.
- Review startup verification requests.
- Manage platform resources and events.
- View administrative reports and audit records.

### Notifications and dashboard
- Show user notifications.
- Provide role-relevant dashboard summaries, activity and quick statistics.

### Optional AI extension
An AI assistant, startup guidance or pitch-review feature may be added only if time permits. It is not a dependency for completing the core platform.

## 5. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Language | JavaScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma ORM 7 |
| Authentication | JWT, bcryptjs and server-side session records |
| Validation | Zod |
| API documentation | Swagger / OpenAPI |
| API testing | Postman |
| Optional AI | External LLM API |
| PDF generation | jsPDF |

## 6. High-level architecture

The application uses one frontend, one backend and one relational database.

```text
React + Vite frontend
        |
        | HTTP requests (/api/v1)
        v
Node.js + Express backend
        |
        | Prisma ORM 7
        v
PostgreSQL database
```

- React handles the user interface.
- Express handles API routes, authentication, authorization and business rules.
- Prisma provides database access.
- PostgreSQL stores persistent application data.
- The database is the source of truth. Persistent data must not be replaced by hardcoded arrays or temporary in-memory data.

The project is intentionally a single application. Microservices are not part of Version 1.0.

## 7. Planned deployment

| Part | Planned platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| PostgreSQL database | Supabase |

These are planned deployment targets, not yet confirmed as configured. Free plans have usage limits and may include sleeping services, inactivity pauses or storage quotas. Free hosting should not be treated as unlimited or guaranteed to be continuously available.

## 8. Development approach

Development will proceed in this order:

1. Finalize and validate the PostgreSQL/Prisma database schema.
2. Create and verify database migrations.
3. Set up the Express backend and Prisma connection.
4. Implement backend modules and business rules.
5. Test API endpoints and complete workflows.
6. Build the React frontend against the implemented APIs.
7. Integrate, test and deploy.
8. Add optional AI functionality only if time permits.

## 9. Scope boundaries

The current Version 1.0 scope does not include:

- Payment processing.
- Video conferencing.
- A native mobile application.
- A custom-trained AI model.
- A complex recommendation engine.
- Real-time direct messaging.

Basic community posts and comments are included.

## 10. Repository documentation

- `README.md` — project purpose, features, technology stack, architecture and setup overview.
- `context/PROJECT_CONTEXT.md` — detailed handoff notes for developers and AI assistants, including decisions, database model names, current progress and next steps.

The context file is an implementation log, not a replacement for this README.

## 11. Current status

The project is at the initial setup/database design stage. The Prisma schema has been drafted in the development conversation. Do not assume that the schema has been validated, migrated, or deployed until those steps have been run and verified.

For the exact implementation status and next actions, see [`context/PROJECT_CONTEXT.md`](context/PROJECT_CONTEXT.md).
