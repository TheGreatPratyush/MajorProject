# Startup-AYUSH Portal

## Complete Project, Frontend and Backend Integration Handover

**Document type:** Repository onboarding and implementation guide\
**Audience:** Frontend developer joining the existing project\
**Project status:** Backend Phases 0--8 implemented to varying levels of
verification; Phase 10 read APIs implemented (notification triggers
pending); Phases 9 and 11 pending\
**Current local backend API base:** `http://localhost:5001/api/v1`\
**Frontend stack:** React, Vite, JavaScript, Tailwind CSS, shadcn/ui,
Recharts\
**Backend stack:** Node.js, Express, CommonJS, PostgreSQL, Prisma 7,
JWT, bcryptjs, Zod\
**Intended deployment direction:** Vercel (frontend), Render (backend),
Supabase PostgreSQL (database)

> **Accuracy note:** This document records the project decisions and
> implementation details confirmed during backend development. It does
> not claim that every earlier-phase endpoint, environment variable,
> script, response shape, or deployment setting has been independently
> re-audited. Where an exact contract is not listed, inspect the
> existing route, controller, validation schema and service before
> integrating it. Do not invent an API contract.

------------------------------------------------------------------------

# 1. Purpose of this document

This document is intended to onboard a developer who has no previous
context about Startup-AYUSH Portal.

After reading it, the developer should understand:

-   What the platform is being built to do.
-   Who the users and stakeholders are.
-   The major functional modules.
-   The existing backend architecture.
-   How the frontend and backend communicate.
-   How to clone, configure and run the repository.
-   How authentication and role-based permissions work.
-   Which backend modules are implemented and which are still pending.
-   How to integrate frontend screens without inventing endpoints or
    changing backend contracts.
-   How to test and report integration problems.
-   What the frontend developer is expected to deliver.

The existing repository is the source of truth for actual code. This
document is the product and integration guide, not a replacement for
inspecting implementation details.

# 2. Project overview

## 2.1 What is Startup-AYUSH Portal?

Startup-AYUSH Portal is a centralized digital ecosystem platform
intended to connect stakeholders in India's AYUSH startup and innovation
ecosystem.

AYUSH covers traditional systems of medicine including:

-   Ayurveda
-   Yoga and Naturopathy
-   Unani
-   Siddha
-   Sowa-Rigpa
-   Homoeopathy

The ecosystem includes startups, entrepreneurs, investors, incubators,
accelerators, mentors, government departments and members of the public.

These stakeholders need ways to discover one another, find programs and
funding opportunities, access official resources, apply for incubation
opportunities, participate in events and exchange knowledge.

The portal is intended to bring these activities into one connected
platform.

**This is not just a static information website.** It is a role-aware,
authenticated ecosystem application with directories, profiles,
programs, applications, networking, mentorship, resources, events and
community interactions.

## 2.2 Main objectives

The platform aims to:

1.  Connect AYUSH startups with investors, incubators, accelerators and
    mentors.
2.  Help startups discover funding and government schemes.
3.  Allow incubators and accelerators to publish programs and review
    applications.
4.  Provide access to regulatory, educational, research and other
    resources.
5.  Allow eligible government stakeholders to publish official
    resources.
6.  Allow eligible organizations to create and manage events.
7.  Let users register for events and manage their registrations.
8.  Provide a community for posts and comments.
9.  Give each stakeholder a suitable profile and discovery experience.
10. Provide administrative verification, moderation, dashboards and
    notifications as later phases are completed.

## 2.3 Product principles

-   One platform, multiple stakeholder roles.
-   Public discovery where information is intended to be public.
-   Authentication for protected actions and private information.
-   Backend-enforced authorization; frontend visibility is not security.
-   Consistent UI and shared components across modules.
-   Reuse existing APIs and business rules.
-   No duplicate business logic in the browser.
-   No invented fields, routes, status values or permissions.
-   Integrate and test one module at a time.

# 3. Stakeholders and roles

The Prisma `UserRole` enum includes:

  -----------------------------------------------------------------------
  Role                    Meaning                 Typical platform
                                                  purpose
  ----------------------- ----------------------- -----------------------
  `STARTUP`               AYUSH startup or        Discover opportunities,
                          entrepreneur            apply to programs,
                                                  connect and participate

  `INVESTOR`              Investor or funding     Discover startups and
                          organization            build connections

  `INCUBATOR`             Incubation organization Publish programs,
                                                  review applications and
                                                  organize events

  `ACCELERATOR`           Accelerator             Publish opportunities
                          organization            and organize events

  `MENTOR`                Mentor or domain expert Provide guidance and
                                                  participate in the
                                                  ecosystem

  `GOVERNMENT`            Government stakeholder  Publish eligible
                                                  official resources and
                                                  organize events

  `PUBLIC`                General user            Browse public content
                                                  and participate in the
                                                  community

  `ADMIN`                 Platform administrator  Manage platform-wide
                                                  operations where
                                                  implemented
  -----------------------------------------------------------------------

Roles are business permissions, not merely labels for displaying
different menus.

The backend checks the authenticated user's actual role and ownership.
The frontend should hide actions the user cannot perform, but must still
handle `401` and `403` responses because UI checks can be bypassed.

## 3.1 Public registration

The current public registration flow supports:

-   `STARTUP`
-   `INVESTOR`
-   `INCUBATOR`
-   `ACCELERATOR`
-   `MENTOR`
-   `PUBLIC`

`GOVERNMENT` and `ADMIN` are not available through ordinary public
registration. Do not expose them as public signup options unless the
backend registration policy is deliberately changed.

# 4. Functional modules and user journeys

## 4.1 Public experience

Unauthenticated visitors should be able to explore public information
supported by the backend, such as:

-   Landing page and platform introduction.
-   Public stakeholder directories.
-   Public resources and government schemes.
-   Published programs.
-   Published events.
-   Active community posts.
-   Login and public registration.

Do not expose private applications, attendee lists, unpublished events
or other protected information through frontend routes.

## 4.2 Authentication

Expected screens:

-   Login.
-   Registration.
-   Current-user/session initialization.
-   Logout.
-   Change password.
-   Protected route handling.

Backend routes confirmed:

  Method    Endpoint                  Authentication
  --------- ------------------------- ----------------
  `POST`    `/auth/register`          Public
  `POST`    `/auth/login`             Public
  `GET`     `/auth/me`                Required
  `POST`    `/auth/logout`            Required
  `PATCH`   `/auth/change-password`   Required

The login controller returns a standard response envelope. The token is
located at `data.token`; user information is at `data.user`.

Bearer authentication format:

``` http
Authorization: Bearer <token>
```

The backend creates a database-backed session. The JWT includes
`userId`, `role` and `sessionId`. The backend stores a SHA-256 hash of
the token in the `Session` table and checks session validity during
authentication.

The frontend must not construct or forge a JWT. It must use the token
returned by login.

**Forgot password:** No password-recovery API was confirmed in the
inspected auth routes. Do not implement a working password-reset flow
against a fictitious endpoint. A visual placeholder can be prepared only
if clearly marked as unavailable until the backend supports it.

## 4.3 Stakeholder profiles

The platform has role-specific profile concepts. Examples of information
that may be relevant include:

-   Startup: organization name, description, AYUSH area, location,
    website and stage.
-   Investor: organization or investor details, interests and investment
    focus.
-   Incubator: organization details, focus areas, location and website.
-   Accelerator: organization details, programs and support focus.
-   Mentor: expertise, professional background and mentorship areas.
-   Government: department, designation, description, official website
    and verification status.

These are product-level examples, not a declaration that every field is
present in every current API schema. Before building a form, inspect the
corresponding profile validation schema and controller. Send only fields
the backend accepts.

Government profile fields confirmed in the Prisma schema include:

-   `departmentName`
-   `designation` (optional)
-   `description` (optional)
-   `officialWebsite` (optional)
-   `verificationStatus` (defaults to `PENDING`)

## 4.4 Directories and discovery

The platform includes stakeholder discovery. Expected user experiences
include:

-   Startup directory.
-   Investor directory.
-   Incubator directory.
-   Accelerator directory.
-   Mentor directory.
-   Search and filters where supported.
-   Pagination where supported.
-   Profile cards and profile detail views.

Use existing Phase 3 APIs. Their exact routes, query parameters,
response structures and visibility rules must be read from the current
repository before implementation. Do not guess endpoint names.

## 4.5 Connections and networking

The Phase 4 backend module supports stakeholder networking. Expected UI
concepts include:

-   View a stakeholder profile.
-   Send a connection request.
-   View sent and received requests.
-   Respond to requests where allowed.
-   View connections.

The precise routes, accepted statuses and transition rules must be read
from the existing Phase 4 route/controller/validation/service files. Do
not invent connection status values or create a frontend-only connection
system.

## 4.6 Mentorship

The Phase 5 backend module supports mentorship workflows. Expected UI
concepts include:

-   Browse mentors.
-   View mentor expertise.
-   Request mentorship.
-   View mentorship requests or relationships.
-   Manage permitted mentorship transitions.

Inspect the existing Phase 5 implementation for exact endpoint paths,
payloads and permissions.

## 4.7 Programs and applications

Phase 6 implements incubation programs and applications.

Core product journey:

1.  An incubator or accelerator creates a program.
2.  The owner publishes the program.
3.  The program becomes discoverable according to backend visibility
    rules.
4.  A startup opens program details.
5.  The startup submits an application.
6.  The program owner reviews received applications.
7.  The owner accepts or rejects an application using supported
    transitions.
8.  The applicant can view the application and its status.
9.  Applicants and owners see only the records permitted to them.

Expected screens:

-   Program directory.
-   Program detail.
-   Create/edit program for eligible owners.
-   My programs.
-   Application submission.
-   Applications submitted.
-   Applications received.
-   Application detail and status actions.

Phase 6 was reported complete and committed as `310ac74`. Its test run
reported **40 passed, 0 failed**, covering public and owner directories,
draft privacy, ownership, role restrictions, creation, publishing,
application creation, duplicate prevention, sent/received listings,
detail permissions, accept/reject/withdraw and program lifecycle
behavior.

Use the existing Phase 6 route files and schemas for exact endpoint
contracts. Do not assume the endpoint names from this conceptual
description.

## 4.8 Resources and government schemes --- Phase 7

Base route:

`/resources`

Resource categories in Prisma:

-   `GOVERNMENT_SCHEME`
-   `FUNDING`
-   `REGULATORY_GUIDELINE`
-   `RESEARCH`
-   `EDUCATION`
-   `OTHER`

Confirmed routes:

  -------------------------------------------------------------------------
  Method            Endpoint            Purpose           Access
  ----------------- ------------------- ----------------- -----------------
  `GET`             `/resources`        List public       Public
                                        resources         

  `GET`             `/resources/mine`   List current      Authenticated
                                        publisher's       
                                        resources         

  `GET`             `/resources/:id`    Get resource      Public, optional
                                        details           auth

  `POST`            `/resources`        Create/publish    Authenticated
                                        resource          eligible
                                                          publisher

  `PATCH`           `/resources/:id`    Update resource   Owner or ADMIN,
                                                          subject to rules

  `DELETE`          `/resources/:id`    Delete resource   Owner or ADMIN,
                                                          subject to rules
  -------------------------------------------------------------------------

Create payload:

``` json
{
  "title": "Example AYUSH Scheme",
  "description": "Description of the scheme.",
  "category": "GOVERNMENT_SCHEME",
  "sourceUrl": "https://example.com/scheme"
}
```

The server derives `publisherId` from the authenticated user. Never send
`publisherId` from the browser.

Confirmed permissions and product decisions:

-   `GOVERNMENT` and `ADMIN` are the publisher roles.
-   A `GOVERNMENT` user must have a `GovernmentProfile` with
    `verificationStatus === "VERIFIED"` to create or modify resources.
-   `ADMIN` does not require a GovernmentProfile.
-   ADMIN can edit/delete any resource.
-   A government user can edit/delete only their own resource.
-   Other roles can browse public resources.
-   An unverified government user cannot create/edit/delete.
-   If government verification is later revoked, existing resources
    remain public, but that government user cannot modify them.
-   Resource publication is immediate.
-   There is no draft or approval workflow for resources in the current
    schema.
-   No separate government-scheme model or new resource migration was
    required.

The list endpoint supports pagination, title/description search,
category filtering and published-date sorting as implemented in the
Phase 7 service/validation. Inspect the exact query schema for parameter
names and defaults before wiring filters.

## 4.9 Events and registrations --- Phase 8

Base route:

`/events`

Confirmed routes:

  ------------------------------------------------------------------------------------
  Method            Endpoint                       Purpose           Access
  ----------------- ------------------------------ ----------------- -----------------
  `GET`             `/events`                      List public       Public
                                                   published events  

  `GET`             `/events/mine`                 List organizer's  Authenticated
                                                   events            

  `GET`             `/events/registrations/mine`   List current      Authenticated
                                                   user's            
                                                   registrations     

  `POST`            `/events`                      Create event      Eligible
                                                                     organizer

  `GET`             `/events/:id`                  Get event detail  Public or
                                                                     owner/admin for
                                                                     private lifecycle
                                                                     states

  `GET`             `/events/:id/registrations`    List event        Organizer or
                                                   attendees         ADMIN

  `POST`            `/events/:id/publish`          Publish event     Owner or ADMIN

  `POST`            `/events/:id/cancel`           Cancel event      Owner or ADMIN

  `POST`            `/events/:id/complete`         Complete event    Owner or ADMIN

  `POST`            `/events/:id/register`         Register current  Authenticated
                                                   user              

  `DELETE`          `/events/:id/register`         Cancel current    Authenticated
                                                   user's            
                                                   registration      

  `PATCH`           `/events/:id`                  Update event      Owner or ADMIN

  `DELETE`          `/events/:id`                  Delete event      Owner or ADMIN,
                                                                     subject to
                                                                     restrictions
  ------------------------------------------------------------------------------------

Eligible organizer roles:

-   `INCUBATOR`
-   `ACCELERATOR`
-   `GOVERNMENT`
-   `ADMIN`

Confirmed event types:

-   `WEBINAR`
-   `WORKSHOP`
-   `CONFERENCE`
-   `NETWORKING`
-   `OTHER`

Confirmed event statuses:

-   `DRAFT`
-   `PUBLISHED`
-   `CANCELLED`
-   `COMPLETED`

Event creation fields in the supplied schema:

-   `title`
-   `description`
-   `eventType`
-   `location` (optional)
-   `onlineMeetingUrl` (optional)
-   `startDate`
-   `endDate`
-   `registrationDeadline` (optional)
-   `capacity` (optional)

Example request body (adapt to the current Zod schema; do not send
unspecified fields):

``` json
{
  "title": "AYUSH Startup Webinar",
  "description": "An online session for AYUSH founders.",
  "eventType": "WEBINAR",
  "location": "Online",
  "onlineMeetingUrl": "https://example.com/meeting",
  "startDate": "2027-02-10T10:00:00.000Z",
  "endDate": "2027-02-10T11:00:00.000Z",
  "registrationDeadline": "2027-02-09T10:00:00.000Z",
  "capacity": 100
}
```

Confirmed business rules:

1.  New events are created as `DRAFT`.
2.  Draft events are not visible in public event browsing.
3.  Organizers can manage their own events.
4.  ADMIN can manage any event.
5.  Only `PUBLISHED` events can be registered for.
6.  Duplicate active registrations are prevented.
7.  Capacity is enforced.
8.  Cancelled registrations can be reactivated instead of creating a
    second row, because `(eventId, userId)` is unique.
9.  Users may cancel their own registration until the registration
    cutoff.
10. The cutoff is `registrationDeadline`, or `startDate` if no deadline
    is provided.
11. An organizer cannot delete an event once registration records exist,
    including cancelled registration records; the event should be
    cancelled or completed instead.
12. Attendee lists are private to the organizer and ADMIN.
13. Users can view their own registrations.

The registration endpoint currently returns **HTTP 200** on success, not
201. The frontend must not assume 201.

The backend service uses row locking in registration-related operations
to protect capacity and registration state. Other event lifecycle/update
concurrency behavior still requires additional review.

**Verification qualification:** The core event integration suite passed,
including event creation/publishing, registration, duplicate prevention,
capacity, cancellation and re-registration. Registration cutoff boundary
cases and all lifecycle transitions were not independently covered in
the reported integration run. Do not mark those edge cases as fully
verified.

## 4.10 Community --- Phase 8

Base route:

`/community`

Confirmed routes:

  -------------------------------------------------------------------------------------------
  Method            Endpoint                              Purpose           Access
  ----------------- ------------------------------------- ----------------- -----------------
  `GET`             `/community/posts`                    List active posts Public

  `GET`             `/community/posts/:postId/comments`   List comments     Optional auth;
                                                                            visibility rules
                                                                            apply

  `POST`            `/community/posts`                    Create post       Authenticated

  `POST`            `/community/posts/:postId/comments`   Create comment    Authenticated

  `PATCH`           `/community/posts/:postId`            Update post       Author or ADMIN

  `DELETE`          `/community/posts/:postId`            Delete post       Author or ADMIN

  `PATCH`           `/community/comments/:commentId`      Update comment    Author or ADMIN

  `DELETE`          `/community/comments/:commentId`      Delete comment    Author or ADMIN

  `GET`             `/community/posts/:postId`            Get post details  Optional auth;
                                                                            visibility rules
                                                                            apply
  -------------------------------------------------------------------------------------------

Confirmed community statuses:

-   `ACTIVE`
-   `HIDDEN`

Permissions:

-   All authenticated active roles, including `PUBLIC`, can create posts
    and comments.
-   Authors can manage their own posts and comments.
-   ADMIN can manage any user's posts and comments.
-   Public browsing returns active posts.
-   Hidden posts are visible to their author and ADMIN under the current
    service rules.
-   Comments can be added only to active posts.

Example payloads:

``` json
{
  "content": "Sharing an update with the AYUSH startup community."
}
```

The frontend should provide a community feed, post details,
create/edit/delete actions, comments and appropriate moderation
controls. Do not invent moderation statuses or controls not supported by
the backend.

# 5. Technical architecture

## 5.1 System flow

``` text
User's browser
     |
     v
React + Vite frontend
     |
     | HTTP / JSON / Bearer JWT
     v
Node.js + Express API
     |
     | authentication middleware
     | Zod validation
     | authorization/business rules
     v
Prisma ORM + PostgreSQL adapter
     |
     v
PostgreSQL database
```

The browser must not connect directly to PostgreSQL. The frontend must
not import Prisma or backend database modules.

## 5.2 Backend technology

Confirmed backend stack:

-   Node.js.
-   Express.
-   CommonJS modules.
-   PostgreSQL.
-   Prisma ORM 7.10.1.
-   PostgreSQL adapter (`PrismaPg`).
-   Shared Prisma client in `database/db.js`, exported as `{ prisma }`.
-   JWT.
-   bcryptjs.
-   Zod validation.

Use the existing shared Prisma client. Do not instantiate another Prisma
client in new backend code.

## 5.3 Frontend technology

Expected frontend stack:

-   React.
-   Vite.
-   JavaScript.
-   Tailwind CSS.
-   shadcn/ui.
-   Recharts.

Check the actual repository before adding or replacing dependencies. Do
not recreate a frontend project if one already exists.

## 5.4 Intended deployment direction

-   Frontend: Vercel.
-   Backend: Render.
-   Database: Supabase PostgreSQL.

These are intended targets, not confirmation that production deployment
is already complete. Production environment variables, CORS, migrations,
build commands, secrets and deployment health checks still need final
verification.

# 6. Repository onboarding: clone, inspect and run

## 6.1 Clone the repository

Use the actual repository URL supplied by the project owner:

``` bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_FOLDER>
```

Do not create a separate repository or initialize a replacement
application.

## 6.2 Inspect the repository before editing

From the repository root:

``` bash
pwd
ls -la
find . -maxdepth 2 -name package.json -not -path '*/node_modules/*'
```

Then inspect:

``` bash
cat package.json
```

If frontend and backend have separate `package.json` files, inspect each
one.

Read:

-   Root README.
-   Existing frontend README, if present.
-   Backend `index.js`.
-   Prisma schema.
-   Existing `.env.example` files.
-   Module route/controller/validation/service files.
-   Existing test scripts.

The exact directory layout and npm scripts must be taken from the cloned
repository, not assumed from this document.

## 6.3 Install dependencies

At each application root that has a `package.json`, run:

``` bash
npm install
```

Do not run installation in a directory that is not an application root.

Do not replace the existing lockfile or upgrade major dependencies
without coordination.

## 6.4 Configure backend environment

The backend requires valid local environment configuration. At minimum,
the inspected authentication service requires:

-   `JWT_SECRET`
-   Optional `JWT_EXPIRES_IN` (defaults to `1d` in the inspected auth
    service)

The database adapter also requires the database connection configuration
used by the existing `database/db.js` and Prisma setup.

Inspect the project's existing environment example and Prisma
configuration to identify the exact database variable name. Do not guess
it.

Use a local `.env` file that is ignored by Git. Never commit secrets or
ask anyone to paste production credentials into chat.

## 6.5 Configure frontend environment

Use a frontend environment variable for the API base URL.

Example local `.env`:

``` env
VITE_API_BASE_URL=http://localhost:5001/api/v1
```

Vite exposes only variables prefixed with `VITE_` to frontend code.
Never put database passwords, JWT signing secrets or other server-only
secrets in a Vite environment variable.

## 6.6 Start the backend

The backend has been tested locally using:

``` bash
PORT=5001 npm run dev
```

Port 5000 may be occupied by macOS AirTunes. Use port 5001 for local
integration unless the team deliberately configures another port.

Expected API base:

`http://localhost:5001/api/v1`

## 6.7 Start the frontend

From the actual frontend application directory, use the script shown in
its `package.json`. For a typical Vite project:

``` bash
npm run dev
```

Use the URL printed by Vite. Port 5173 is common but must not be assumed
if the project reports another port.

## 6.8 Verify the local setup

Before building screens, verify:

1.  Backend starts successfully.
2.  Frontend starts successfully.
3.  Database is reachable by the backend.
4.  Public API requests return JSON.
5.  Frontend can reach the backend.
6.  CORS allows the local frontend origin.
7.  Login returns a token.
8.  `/auth/me` works with the token.
9.  Protected routes reject unauthenticated requests.
10. Logout revokes the current session.

Useful public endpoint checks:

``` bash
curl -i http://localhost:5001/api/v1/resources
curl -i http://localhost:5001/api/v1/events
curl -i http://localhost:5001/api/v1/community/posts
```

The public endpoints above were previously observed returning HTTP 200
with empty lists in the development database. Actual responses will
depend on database contents.

**CORS must be checked in the backend source.** Do not assume every
local Vite origin is already allowed.

# 7. Recommended frontend architecture

The following is a recommended organization. It is not a claim that
these folders already exist. Adapt it to the current repository and
avoid creating duplicate structures.

``` text
frontend/
  src/
    app/
      App.jsx
      routes.jsx

    components/
      common/
      layout/
      navigation/
      forms/
      cards/
      tables/
      feedback/

    pages/
      public/
      auth/
      dashboard/
      profile/
      startups/
      investors/
      incubators/
      accelerators/
      mentors/
      connections/
      mentorship/
      programs/
      resources/
      events/
      community/

    services/
      api.js
      auth.service.js
      profile.service.js
      directory.service.js
      connection.service.js
      mentorship.service.js
      program.service.js
      resource.service.js
      event.service.js
      community.service.js

    hooks/
    context/
    utils/
    constants/
    styles/

  public/
```

## 7.1 Centralized API client

Create one API client instead of writing raw `fetch()` calls throughout
UI components.

It should:

-   Read `VITE_API_BASE_URL`.
-   Attach the Bearer token for protected requests.
-   Set JSON content headers when sending JSON.
-   Parse response bodies safely.
-   Normalize error handling.
-   Handle `401` consistently.
-   Avoid attaching an absent or invalid token.
-   Avoid logging credentials or tokens.

Conceptual example:

``` js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

A protected request must include:

``` http
Authorization: Bearer <token>
```

Do not hardcode API URLs in individual components.

## 7.2 Authentication state

Use one shared authentication state source, such as the project's
existing context or state-management pattern.

Recommended startup flow:

1.  Read the locally stored authentication state according to the agreed
    security approach.
2.  If no token exists, show the public experience.
3.  If a token exists, call `GET /auth/me`.
4.  If successful, initialize the current user.
5.  If the server returns `401`, clear invalid authentication state.
6.  Render role-aware navigation.
7.  Protect private routes.
8.  On logout, call the backend and clear local state.

Login flow:

1.  Submit credentials to `POST /auth/login`.
2.  Read `data.token` and `data.user`.
3.  Initialize authenticated state.
4.  Fetch `/auth/me` if required by the chosen app initialization
    pattern.
5.  Navigate to the appropriate landing page.

Logout flow:

1.  Call `POST /auth/logout` with the token.
2.  Clear local authentication state even if the session has become
    invalid.
3.  Redirect to a public page.

The current backend uses Bearer JWT authentication. Do not independently
switch the frontend to cookie authentication unless the backend is
deliberately adapted and both developers agree.

For production, the team should review token storage and XSS
protections. A properly configured HttpOnly, Secure, SameSite cookie
approach can be preferable, but it requires backend support and is not
the current confirmed API contract.

## 7.3 Route protection

Create clear route categories:

-   Public routes.
-   Authenticated routes.
-   Role-restricted routes.

A protected route should wait for session initialization before deciding
whether to redirect. Avoid rendering protected content briefly while
`/auth/me` is still loading.

Frontend route protection is for user experience. Backend authorization
remains mandatory.

## 7.4 Role-aware navigation

Use one central role-to-navigation configuration instead of scattering
role checks throughout every component.

Indicative product matrix:

  -------------------------------------------------------------------------------------------------------------------------------------------
  Feature       STARTUP           INVESTOR          INCUBATOR     ACCELERATOR   MENTOR            GOVERNMENT    PUBLIC            ADMIN
  ------------- ----------------- ----------------- ------------- ------------- ----------------- ------------- ----------------- -----------
  Public        Browse            Browse            Browse        Browse        Browse            Browse        Browse            Browse
  directories                                                                                                                     

  Programs      Browse/apply      Browse            Manage own    Manage own    Browse            Browse        Browse            Manage
                                                                                                                                  according
                                                                                                                                  to API

  Resources     Browse            Browse            Browse        Browse        Browse            Manage own if Browse            Manage
                                                                                                  verified                        

  Events        Browse/register   Browse/register   Organize      Organize      Browse/register   Organize      Browse/register   Manage

  Community     Participate       Participate       Participate   Participate   Participate       Participate   Participate       Moderate
  -------------------------------------------------------------------------------------------------------------------------------------------

This is a UI planning matrix based on the confirmed product rules, not a
substitute for checking each route's authorization. A role may see a
page but still be unable to perform a particular action.

## 7.5 Shared UI components

Prefer reusable components for:

-   App shell.
-   Header and sidebar.
-   Breadcrumbs.
-   Page titles.
-   Cards.
-   Search and filters.
-   Pagination.
-   Forms and field errors.
-   Tables.
-   Confirmation dialogs.
-   Toasts.
-   Loading skeletons.
-   Empty states.
-   Error states.
-   Access-denied states.

Use a consistent design system across modules.

# 8. API integration rules

## 8.1 Response envelopes

The general success response shape is:

``` json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": null
}
```

The general error shape is:

``` json
{
  "success": false,
  "message": "Request failed",
  "errors": []
}
```

Do not assume all endpoints have identical `data` nesting. Inspect each
controller response before mapping fields in the UI.

## 8.2 HTTP statuses

Handle at least:

  -------------------------------------------------------------------------
  Status                  Meaning                   Frontend behavior
  ----------------------- ------------------------- -----------------------
  `200`                   Successful request        Display/update data

  `201`                   Created, where used       Show success and new
                                                    record

  `400`                   Invalid input             Display validation
                                                    errors

  `401`                   Missing/invalid/expired   Clear or reinitialize
                          authentication            session

  `403`                   Authenticated but not     Show access-denied
                          permitted                 feedback

  `404`                   Record or route not found Show not-found state

  `409`                   Conflict/duplicate        Explain conflict and
                          operation                 refresh relevant data

  `500`                   Server error              Show safe generic error
                                                    and allow retry
  -------------------------------------------------------------------------

Do not assume an endpoint uses 201 just because it creates a record. The
event registration route currently returns 200.

## 8.3 Query parameters

Use only parameters accepted by the relevant Zod validation schema.

Do not assume that all modules share the same pagination, sorting or
filter names.

For every list endpoint, inspect:

-   Query schema.
-   Default page.
-   Default limit.
-   Maximum limit.
-   Search fields.
-   Filter enums.
-   Sort field.
-   Sort direction.
-   Response metadata.

## 8.4 Ownership fields

Do not send server-derived ownership fields such as:

-   `publisherId`
-   `organizerId`
-   `userId` for the acting user

unless the exact API explicitly requires a relationship target as part
of its contract.

For resources, `publisherId` is derived from the authenticated user. For
events, `organizerId` is derived from the authenticated user. For
community posts/comments, the author is derived from the authenticated
user.

## 8.5 Validation

The backend uses Zod validation. Frontend validation is for usability,
not security.

-   Match required fields.
-   Match enum values exactly.
-   Match date formats.
-   Do not submit unknown properties.
-   Show backend validation messages.
-   Do not silently ignore a failed API request.

# 9. Frontend screen expectations

## 9.1 Public pages

-   Landing page.
-   About/platform overview.
-   Public stakeholder discovery.
-   Public programs.
-   Public resources.
-   Public events.
-   Community feed.
-   Login.
-   Registration.

## 9.2 Shared authenticated pages

-   Dashboard shell.
-   Profile.
-   Account settings.
-   Change password.
-   Notifications only when the backend supports them.
-   Logout.

## 9.3 STARTUP experience

-   Startup profile.
-   Discover programs.
-   Program details and application submission.
-   Applications submitted and status.
-   Discover investors/incubators/mentors.
-   Connections.
-   Events and registrations.
-   Community.

## 9.4 INVESTOR experience

-   Investor profile.
-   Startup discovery.
-   Connections.
-   Public programs/resources/events.
-   Community.

## 9.5 INCUBATOR and ACCELERATOR experience

-   Organization profile.
-   Program management.
-   Applications received.
-   Application review.
-   Event management.
-   Connections.
-   Community.

## 9.6 MENTOR experience

-   Mentor profile.
-   Mentorship discovery and requests.
-   Connections.
-   Public programs/resources/events.
-   Community.

## 9.7 GOVERNMENT experience

-   Government profile.
-   Verification information.
-   Published resources.
-   Event management.
-   Public ecosystem discovery.
-   Community.

Do not allow publishing resources until the backend confirms that the
government profile is verified.

## 9.8 PUBLIC experience

-   Public discovery.
-   Public resources.
-   Published events.
-   Community participation after authentication.
-   Public registration and login.

## 9.9 ADMIN experience

Prepare navigation and page architecture for administrative workflows,
but do not assume all Phase 9 admin APIs exist. Administrative screens
depending on pending APIs should be marked as pending or implemented
only after the backend contract is supplied.

# 10. Backend completion and pending work

## 10.1 Roadmap status

  --------------------------------------------------------------------------------------
  Phase                   Module                                 Current status
  ----------------------- -------------------------------------- -----------------------
  0                       Backend foundation                     Established

  1                       Authentication                         Implemented; some
                                                                 additional endpoint
                                                                 checks were deferred

  2                       Stakeholder profiles                   Implemented

  3                       Directories and discovery              Implemented

  4                       Connections/networking                 Committed

  5                       Mentorship                             Committed

  6                       Programs/applications                  Complete; 40 tests
                                                                 passed

  7                       Resources/government schemes           Implemented; core
                                                                 integration tests
                                                                 passed

  8                       Events/community                       Implemented; core
                                                                 integration tests
                                                                 passed, edge cases
                                                                 remain

  9                       Admin/verification/moderation          Pending

  10                      Dashboards/notifications               Read APIs
                                                                 implemented and
                                                                 tested; triggers
                                                                 pending approval

  11                      Regression/docs/hardening/deployment   Pending
  --------------------------------------------------------------------------------------

Known relevant commits from prior development:

-   Phase 4: `18ee160`
-   Phase 5: `f3f48a0`
-   Phase 6: `310ac74`

The repository may have newer commits. Check `git log` after cloning.

## 10.2 Phase 7 verification

A combined database integration test successfully covered:

-   Public resource browsing.
-   Startup role denied resource creation.
-   Unverified government role denied resource creation.
-   Verified government publishing.
-   Public resource detail.
-   Another government user denied edit/delete.
-   Owner update.
-   Admin update.
-   Government verification revocation blocking further modification.
-   Existing resource remaining publicly visible.
-   Admin deletion and publishing.

The test suite reported success.

## 10.3 Phase 8 verification

The combined database integration test successfully covered:

-   Organizer role restrictions.
-   Draft event visibility.
-   Event publishing.
-   Public event details.
-   Registration.
-   Duplicate registration prevention.
-   Capacity enforcement.
-   Attendee list privacy.
-   Organizer attendee access.
-   Registration cancellation.
-   Re-registration after cancellation.
-   Event deletion restriction when registration records exist.
-   Unauthorized event update denial.
-   Admin event cancellation.
-   Public-role community post creation.
-   Community post browsing and detail.
-   Comment creation.
-   Author ownership restrictions.
-   Admin post/comment moderation.

The combined test run reported:

``` text
tests 9
pass 9
fail 0
```

Five tests were existing validation tests; the integration test
contained the resource, event and community subtests.

After test cleanup, database counts returned to:

``` text
Users: 4
Resources: 0
Events: 0
Registrations: 0
Posts: 0
Comments: 0
```

The four existing users were preserved.

## 10.4 Phase 8 remaining verification

Not independently verified in the reported run:

-   Registration cancellation exactly at the cutoff.
-   Registration cancellation after the cutoff.
-   Every event lifecycle transition.
-   Additional race/concurrency cases around event updates and lifecycle
    changes.
-   Full integration regression under concurrent requests.

Do not describe these edge cases as fully tested.

## 10.5 Phase 9 --- pending

Planned area:

-   Admin management.
-   Stakeholder verification workflows.
-   Moderation.
-   Administrative permission checks.
-   Related administrative views and APIs.

The exact UI/API contract must be agreed when backend Phase 9 is
implemented.

## 10.6 Phase 10 --- read APIs implemented

Implemented and covered by `tests/phase10.*.test.js`:

-   `GET /dashboard/summary`: role-specific counts from existing tables.
-   `GET /dashboard/activity`: paginated feed of the caller's
    connections, mentorship requests, program applications and event
    registrations.
-   `/notifications`: list, unread count, mark one or all as read,
    delete. Every query is scoped to the signed-in user.

Still pending:

-   Notification triggers. No Phase 4--8 action creates notifications
    yet, so lists stay empty until the lead approves the trigger rules.
-   The ADMIN dashboard. ADMIN receives `403` until Phase 9 provides
    it.

Field-level contract: Appendix C. Do not display fabricated dashboard
metrics or notifications.

## 10.7 Phase 11 --- pending

Planned area:

-   Full regression testing.
-   OpenAPI/Swagger documentation.
-   Postman collection.
-   Security hardening.
-   Production configuration.
-   Deployment and health checks.
-   Final frontend/backend integration.

# 11. Frontend implementation sequence

Develop and integrate incrementally.

## Stage 1 --- Foundation

-   Inspect existing frontend.
-   Confirm package manager and scripts.
-   Set up routing.
-   Configure Tailwind and shadcn/ui according to existing setup.
-   Create shared app layout.
-   Create centralized API client.
-   Implement authentication state.
-   Implement public/protected route handling.
-   Verify CORS and local API connectivity.

## Stage 2 --- Public experience

-   Landing page.
-   Login.
-   Registration.
-   Public directories.
-   Public resources.
-   Public events.
-   Community feed.

## Stage 3 --- Profile and discovery

-   Profile views and editing.
-   Role-specific navigation.
-   Directories.
-   Search and filters.
-   Connections.
-   Mentorship.

## Stage 4 --- Core workflows

-   Programs.
-   Applications.
-   Resource publishing for eligible users.
-   Event management.
-   Event registration.
-   Community posts and comments.

## Stage 5 --- Integration and quality

-   Loading/error/empty states.
-   Permission testing.
-   Responsive testing.
-   API mismatch resolution.
-   Full user journey tests.
-   Accessibility and usability review.

Do not build every screen independently and integrate everything at the
end. Each module should be connected to the backend as it is developed.

# 12. Data flow examples

## 12.1 Startup applies to an incubation program

1.  Startup logs in.
2.  Frontend receives `data.token`.
3.  Frontend calls `/auth/me` and initializes the current user.
4.  Frontend retrieves the public program directory using the actual
    Phase 6 route.
5.  Startup opens program details.
6.  Frontend displays the actual program data.
7.  Startup completes the application form.
8.  Frontend sends the application to the existing application endpoint.
9.  Backend validates the user, program and application rules.
10. Backend stores the application.
11. Frontend displays the returned result.
12. Program owner views received applications.
13. Owner uses the permitted status action.
14. Applicant sees the updated status on a later fetch.

The frontend must not mark an application accepted locally before the
backend confirms it.

## 12.2 Government stakeholder publishes a scheme

1.  Government stakeholder logs in.
2.  Frontend initializes their user and profile.
3.  Frontend shows government-specific navigation.
4.  User opens the resource creation page.
5.  User enters title, description, category and source URL.
6.  Frontend submits the authenticated request.
7.  Backend checks role and government verification.
8.  Backend creates the resource if permitted.
9.  Frontend displays the response and refreshes the list.

If verification is pending/rejected, the backend denies publishing.
Display a clear message; do not bypass the check.

## 12.3 User registers for an event

1.  User browses published events.
2.  Frontend opens event detail.
3.  User clicks Register.
4.  Frontend calls `POST /events/:id/register`.
5.  Backend checks published status, cutoff, start time, duplicate
    registration and capacity.
6.  Backend creates or reactivates the registration.
7.  Frontend updates the UI after a successful response.
8.  If registration is full or closed, show the backend's error.

## 12.4 User participates in the community

1.  Authenticated user opens community feed.
2.  Frontend retrieves active posts.
3.  User submits a post.
4.  Backend creates it using the authenticated user's identity.
5.  Frontend refreshes or updates the feed.
6.  Another authenticated user submits a comment.
7.  Authors manage their own content.
8.  ADMIN can moderate any user's content.

# 13. Integration rules --- mandatory

1.  Never invent endpoint paths.
2.  Never invent request fields.
3.  Never invent response nesting.
4.  Never invent enum values.
5.  Never assume a route is public or protected without checking it.
6.  Never treat frontend role checks as authorization.
7.  Never send owner IDs for values derived by the server.
8.  Never display fake metrics as real backend data.
9.  Never permanently substitute mock data for an API.
10. Never change Prisma schema or migrations without coordination.
11. Never rename backend fields in the frontend request.
12. Never silently swallow API errors.
13. Never assume a create action returns HTTP 201.
14. Never expose secrets in frontend environment variables.
15. Never commit `.env` files or tokens.
16. Do not build a working UI for pending APIs as if they exist.
17. Confirm a contract change with the backend developer before
    implementation.

## 13.1 Required process before integrating any endpoint

For every feature:

1.  Find the route definition.
2.  Read its controller.
3.  Read its Zod validation schema.
4.  Read its service.
5.  Identify authentication middleware.
6.  Identify role and ownership rules.
7.  Confirm request body and query parameters.
8.  Confirm response and error structure.
9.  Implement a frontend service function.
10. Integrate the service into the UI.
11. Test success, validation failure and permission failure.

## 13.2 Do not duplicate business logic

The frontend may provide immediate usability checks, but backend rules
are authoritative.

Examples:

-   Do not decide that a government user is verified using frontend
    state alone.
-   Do not decide that an event has capacity using a stale browser
    count.
-   Do not accept an application locally without a backend response.
-   Do not let a browser-supplied `publisherId` determine resource
    ownership.
-   Do not let a browser-supplied `organizerId` determine event
    ownership.

# 14. UI quality expectations

The frontend should feel like a professional national ecosystem
platform, not a collection of disconnected CRUD forms.

Requirements:

-   Responsive layouts.
-   Consistent typography and spacing.
-   Consistent color and component system.
-   Accessible form labels and controls.
-   Clear navigation.
-   Reusable components.
-   Search and filters where supported.
-   Loading skeletons.
-   Empty states.
-   Validation feedback.
-   Success feedback.
-   Confirmation dialogs for destructive actions.
-   Error and retry states.
-   Clear forbidden and not-found states.

Avoid using fake statistics or placeholder profiles in production-facing
screens.

# 15. Testing expectations

Every API-connected page must be tested for:

-   Successful response.
-   Empty response.
-   Loading state.
-   Invalid form submission.
-   Unauthenticated request.
-   Forbidden action.
-   Not-found resource.
-   Server/network failure.
-   Refresh behavior.
-   Role-specific behavior.

Important user journeys to test:

-   Register/login/logout.
-   Load current user.
-   Edit profile.
-   Browse a directory.
-   Create and manage a connection.
-   Request mentorship.
-   Browse a program.
-   Submit an application.
-   Review an application as an owner.
-   Browse and publish resources as an eligible publisher.
-   Create and publish an event.
-   Register and cancel event registration.
-   Create a community post and comment.
-   Attempt unauthorized actions and verify they are rejected.

# 16. Git workflow

Do not work directly on `main` unless the project owner explicitly asks.

Suggested branches:

-   `frontend-development`
-   `frontend/auth`
-   `frontend/dashboard`
-   `frontend/programs`
-   `frontend/resources`
-   `frontend/events`
-   `frontend/community`

Adapt branch naming to the repository's existing convention.

Each pull request should include:

-   Purpose of the change.
-   Screens/pages changed.
-   APIs integrated.
-   Files changed.
-   Test results.
-   Screenshots where useful.
-   Known limitations.

Do not merge changes that break the shared application.

Do not modify backend contracts in a frontend branch without
coordination.

# 17. How to report integration problems

When an API integration fails, provide the following information:

``` text
Module:
Frontend page:
API endpoint:
HTTP method:
Request payload:
Expected response:
Actual response:
HTTP status:
Browser console error:
Browser Network tab response:
Backend terminal error:
Steps to reproduce:
```

This is much more useful than reporting only that "the API is not
working."

Do not work around a backend error by hardcoding a successful frontend
response.

# 18. Definition of done

A frontend module is complete only when:

-   UI screens are implemented.
-   It uses the real backend API.
-   Request fields match backend validation.
-   Response mapping matches the actual controller.
-   Authentication works where required.
-   Role and ownership behavior is respected.
-   Loading, empty, error and success states work.
-   The feature is tested against the real development backend.
-   No permanent mock data is used for real functionality.
-   The module does not break existing routes or features.
-   Changes are committed on the correct branch and documented.

# 19. Immediate work allocation

The frontend developer can start with:

1.  Clone and inspect the existing repository.
2.  Confirm the frontend application structure.
3.  Set up local dependencies and environment variables.
4.  Run the backend on port 5001.
5.  Run the frontend.
6.  Verify CORS and authentication.
7.  Build the shared layout, routing and API client.
8.  Implement login, registration and session initialization.
9.  Integrate public resources, events and community.
10. Continue through profiles, directories, programs, applications,
    connections and mentorship using existing backend contracts.

Backend development continues in parallel on:

-   Remaining Phase 8 edge-case tests.
-   Phase 9 admin, verification and moderation.
-   Phase 10 notification triggers.
-   Phase 11 full regression, documentation, security and deployment.

The frontend developer should not wait for Phases 9--11 to begin. Pages
depending on those pending APIs can be planned, but should not be
represented as functional until their backend contracts are implemented.

# 20. Final project understanding

Startup-AYUSH Portal is a connected, multi-stakeholder ecosystem
platform.

The frontend is responsible for presentation, navigation, forms, user
interaction and API communication.

The backend is responsible for authentication, authorization,
validation, business rules and persistence.

The database is accessed only through the backend.

Both developers must work against the same agreed API contracts.

**The immediate goal is to integrate the frontend with the existing
Phases 0--8 backend while backend development continues on remaining
Phase 8 verification and Phases 9--11.**

The frontend developer should be able to clone the repository, configure
the local environment, run the application, understand the business
workflows and begin implementation using this document and the actual
source code---without needing undocumented assumptions or a separate
verbal explanation.

------------------------------------------------------------------------

# Appendix A --- Confirmed Phase 7 and 8 API quick reference

## Resources

``` text
GET     /resources
GET     /resources/mine
GET     /resources/:id
POST    /resources
PATCH   /resources/:id
DELETE  /resources/:id
```

## Events

``` text
GET     /events
GET     /events/mine
GET     /events/registrations/mine
POST    /events
GET     /events/:id/registrations
POST    /events/:id/publish
POST    /events/:id/cancel
POST    /events/:id/complete
POST    /events/:id/register
DELETE  /events/:id/register
PATCH   /events/:id
DELETE  /events/:id
GET     /events/:id
```

## Community

``` text
GET     /community/posts
GET     /community/posts/:postId/comments
POST    /community/posts
POST    /community/posts/:postId/comments
PATCH   /community/posts/:postId
DELETE  /community/posts/:postId
PATCH   /community/comments/:commentId
DELETE  /community/comments/:commentId
GET     /community/posts/:postId
```

## Authentication

``` text
POST    /auth/register
POST    /auth/login
GET     /auth/me
POST    /auth/logout
PATCH   /auth/change-password
```

All paths above are relative to:

`http://localhost:5001/api/v1`

# Appendix B --- Confirmed Phase 7 and 8 enums

## ResourceCategory

``` text
GOVERNMENT_SCHEME
FUNDING
REGULATORY_GUIDELINE
RESEARCH
EDUCATION
OTHER
```

## EventType

``` text
WEBINAR
WORKSHOP
CONFERENCE
NETWORKING
OTHER
```

## EventStatus

``` text
DRAFT
PUBLISHED
CANCELLED
COMPLETED
```

## EventRegistrationStatus

``` text
REGISTERED
CANCELLED
```

## PostStatus

``` text
ACTIVE
HIDDEN
```

## UserRole

``` text
STARTUP
INVESTOR
INCUBATOR
ACCELERATOR
MENTOR
GOVERNMENT
PUBLIC
ADMIN
```

# Appendix C --- Phase 10 API reference

All paths are relative to `http://localhost:5001/api/v1`. Every route
requires `Authorization: Bearer <token>` (401 without a valid session).
Responses use the standard envelope from section 8.1. Lists return
`data: { items }` and `meta: { page, limit, total, totalPages }`.

## C.1 Notifications --- `/notifications`

Authorization: any signed-in role. Every query is filtered by the
caller's user id. Another user's notification returns `404`, never
`403`.

``` text
GET     /notifications                 list (newest first)
GET     /notifications/unread-count    { count }
PATCH   /notifications/read-all        { updated }
PATCH   /notifications/:id/read        the updated notification
DELETE  /notifications/:id             { id }
```

`GET /notifications` query (unknown parameters return `400`):

  Parameter   Type                Default   Meaning
  ----------- ------------------- --------- -------------------------------
  `page`      integer >= 1        1         Page number
  `limit`     integer 1--100      10        Items per page
  `isRead`    `true` / `false`    ---       Filter by read state
  `type`      `NotificationType`  ---       Filter by notification type

Notification item:

  Field               Type              Meaning / source
  ------------------- ----------------- --------------------------------------
  `id`                UUID              `Notification.id`
  `title`             string            Short heading, max 150 characters
  `message`           string            Body text, max 1000 characters
  `type`              enum              `NotificationType` (below)
  `relatedEntityId`   UUID or `null`    Id of the connection, application or
                                        event the notification refers to
  `isRead`            boolean           `false` until marked read
  `createdAt`         ISO date-time     When the notification was created

`userId` is never returned. `:id` must be a UUID (`400` otherwise).
Marking an already-read notification as read succeeds and changes
nothing. `read-all` returns the number of rows changed. Delete is
permanent.

`NotificationType`: `CONNECTION`, `MENTORSHIP`, `APPLICATION`, `EVENT`,
`SYSTEM`, `OTHER`.

## C.2 Dashboard summary --- `GET /dashboard/summary`

Authorization: every role except ADMIN, which gets `403` ("Admin
dashboard is provided by Phase 9."). Each count covers only the
caller's own records.

``` json
{
  "role": "STARTUP",
  "profile": { "exists": true, "verificationStatus": "VERIFIED" },
  "metrics": { "notifications": { "unread": 0 }, "...": "..." }
}
```

  Field                         Meaning / source
  ----------------------------- -------------------------------------------
  `role`                        Caller's `UserRole`
  `profile.exists`              Whether the caller has a profile for their
                                role
  `profile.verificationStatus`  `PENDING` / `VERIFIED` / `REJECTED`; `null`
                                for INVESTOR, MENTOR, PUBLIC or no profile

Metrics returned for every role:

  Metric                          Source and rule
  ------------------------------- -------------------------------------------
  `notifications.unread`          Caller's notifications with `isRead=false`
  `connections.pendingReceived`   `PENDING` requests where caller is receiver
  `connections.pendingSent`       `PENDING` requests where caller is sender
  `connections.accepted`          `ACCEPTED` requests on either side
  `events.activeRegistrations`    `REGISTERED` registrations for a
                                  `PUBLISHED` event whose `endDate` has not
                                  passed
  `community.posts`               Caller's `ACTIVE` community posts

Role-specific metrics:

  Role                     Metric                                     Source
  ------------------------ ------------------------------------------ ------------------------------
  STARTUP                  `programApplications.byStatus`             Applications the startup made
  STARTUP                  `mentorship.sent.byStatus`                 Mentorship requests it sent
  MENTOR                   `mentorship.received.byStatus`             Requests addressed to the
                                                                      mentor
  INCUBATOR, ACCELERATOR   `programs.byStatus`                        Programs the caller owns
  INCUBATOR, ACCELERATOR   `programApplications.received.byStatus`    Applications to those programs
  INCUBATOR, ACCELERATOR   `organizedEvents.byStatus`                 Events the caller organizes
  GOVERNMENT               `resources.published`                      Resources the caller published
  GOVERNMENT               `organizedEvents.byStatus`                 Events the caller organizes

INVESTOR and PUBLIC receive only the common metrics. Every `byStatus`
object lists all values of its enum, with `0` where there are no rows:

-   Program applications: `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`.
-   Mentorship: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`,
    `COMPLETED`.
-   Programs: `DRAFT`, `PUBLISHED`, `CLOSED`, `COMPLETED`.
-   Events: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`.

## C.3 Dashboard activity --- `GET /dashboard/activity`

Authorization: every role except ADMIN (`403`). The feed contains only
records the caller takes part in.

  Parameter   Type           Default   Rule
  ----------- -------------- --------- --------------------------------
  `page`      integer >= 1   1         `page * limit` must be <= 500
  `limit`     integer 1--50  10        Items per page

Unknown parameters return `400`. A page past the end returns an empty
`items` array with the correct `meta.total`.

Activity item:

  Field           Type                       Meaning / source
  --------------- -------------------------- ---------------------------------
  `kind`          enum                       `CONNECTION`, `MENTORSHIP`,
                                             `PROGRAM_APPLICATION` or
                                             `EVENT_REGISTRATION`
  `id`            UUID                       Id of the source record
  `status`        string                     The record's own status enum
  `title`         string                     "Connection request
                                             sent/received", "Mentorship
                                             request sent/received", the
                                             program name or the event title
  `counterpart`   `{ id, name, role }`       The other user: receiver or
                                             sender, mentor or applicant,
                                             program owner or startup, event
                                             organizer
  `updatedAt`     ISO date-time              Record's `updatedAt`; for event
                                             registrations, `createdAt`

Included records:

-   Connections where the caller is sender or receiver.
-   Mentorship requests where the caller is applicant or mentor.
-   Program applications the caller made, or that were made to the
    caller's programs.
-   The caller's own event registrations.

Ordered newest first. Records with the same timestamp are ordered by
`id`, so pages never overlap or skip items.

------------------------------------------------------------------------

**End of handover document.**
