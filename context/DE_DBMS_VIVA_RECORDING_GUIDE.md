# Startup-AYUSH Portal — DBMS Viva Recording Guide

This guide is written for the current repository and the confirmed local
`ayushPortal` database. The narration is designed for about eight minutes at a
steady pace of roughly 115–125 words per minute. The timestamps include brief
file and window changes.

## 1. Narration-only script

Good morning. My name is Pratyush Gupta, and today I am presenting the database
management concepts in my project, Startup-AYUSH Portal. The portal connects
AYUSH startups, investors, incubators, mentors, government stakeholders and
other users.

The application uses PostgreSQL as its relational database and Prisma as its
database ORM. The schema contains users and stakeholder profiles, resources,
events, event registrations, community posts and comments. Primary keys
identify records, while foreign keys connect related records. The application
reads and writes this data through feature services. For example, it lists
events and resources, creates community posts, and handles event registration.

PostgreSQL is a good fit because the data has clear relationships and needs
consistent updates. An event belongs to an organizer, and a user registers for
an event. A relational schema represents these links directly. PostgreSQL also
provides transactions, foreign keys, unique indexes and SQL joins. A document
database could store this information, but our related entities and
registration rules make a relational model a natural choice. This is a design
reasoning, not a claim that the project benchmarked multiple database systems.
The schema also uses enumerated values for roles, event types, event status and
resource categories. This makes the allowed values explicit and keeps
application records aligned with the domain choices.

In the schema, each User has a UUID primary key and a unique email. A
GovernmentProfile has a unique userId foreign key, so one user can have at most
one government profile. One user can have many community posts. Events and
users have a many-to-many relationship: EventRegistration is the junction
table. It stores eventId, userId, registrationStatus and createdAt, and its
eventId-userId pair is unique. Event also points to its organizer, Resource
points to its publisher, and Comment points both to its post and its author.
These are concrete foreign-key relationships, not just labels in an ER diagram.

I can demonstrate the relationships with a SQL join across EventRegistration,
Event and User. In the seeded local database, the join returns two rows for
the AYUSH Startup Incubation Workshop. Both registrations are marked
REGISTERED, and the rows show the two existing startup users. This is a live
database query; the application service uses Prisma relations rather than
embedding this particular SQL statement in the source.

For normalization, the core event and registration design stores each fact in
one appropriate place. User details stay in User, event details stay in Event,
and EventRegistration stores the relationship and registration-specific
status. This avoids repeating full user and event details in every
registration. The registration id determines its eventId, userId, status and
createdAt. The unique eventId-userId pair is also an alternate key for that
registration. Separating the details also reduces update anomalies: a user’s
name or an event’s title is stored with that entity rather than copied to each
registration. These choices support the goals of Third Normal Form for this
core relationship. I have not run a formal 3NF proof across every table, so I
describe this as a normalized design rather than a schema-wide certification.

Data integrity is protected at more than one level. The database defines
primary keys, foreign keys, unique email and a unique eventId-userId index.
The event API also validates fields such as event type, dates and positive
capacity. During registration, the service checks that the event is published,
that the deadline has not passed, that the event has not started, and that
capacity remains. If capacity is null, the service skips the numeric capacity
limit. The event row lock is scoped to one event, rather than locking the whole
registration table, so requests for different events do not need that same
row lock.

The registration service wraps these checks and the registration write in a
Prisma transaction. Before checking capacity, it runs PostgreSQL SELECT FOR
UPDATE on the event row. Concurrent registrations for the same event therefore
wait on that row lock and recheck the registered count in the transaction.
This helps prevent the available capacity from being exceeded. If a check or
write fails, the transaction does not commit a partial registration. The seed
data itself was inserted directly through Prisma in a separate transaction;
it did not call the application registration endpoint.

Indexes support the query patterns we have today. Event has indexes on
startDate and on status with startDate. EventRegistration has a unique
eventId-userId index and an index on userId. CommunityPost has indexes on
createdAt and status with createdAt; Comment has an index on postId with
createdAt; Resource has indexes on category and publishedAt. Indexes can
reduce lookup and sorting work, but they consume storage and add work to
inserts, updates and deletes. Also, an index does not automatically speed up
every search expression. The event list applies sorting and pagination, while
resource and community lists also use pagination. When investigating a slow
query, I would check its actual filter, sort order and query plan before
deciding whether a new index will help.

If workload grew to one hundred times its current level, I would first measure
the actual read and write mix, query plans, latency and database resource use.
The viva seed contains only a few demonstration rows, so it is not a
performance benchmark. I would tune or add indexes only for measured
bottlenecks, then review connection-pool settings and database capacity.
Read replicas could help if reads dominate and replication lag is acceptable.
Partitioning would need a clear large-table or retention use case. This
repository does not currently implement replicas, partitioning, sharding or
explicit pool tuning.

To conclude, PostgreSQL gives this project relational integrity, transactions
and indexes, while Prisma provides the application’s database access layer.
Thank you.

## 2. Recording preparation

### Confirm the project and start the backend

Use the project directory and the actual `dev` script from [package.json](../package.json#L6).
The server loads `.env`, defaults to port 5000, binds to `127.0.0.1`, and
exposes a database health endpoint in [index.js](../index.js#L30) and
[index.js](../index.js#L74).

**Preparation terminal 1:**

```bash
cd /Users/pratyushgupta/Desktop/majorProject
npm run dev
```

**Preparation terminal 2:**

```bash
curl -fsS http://127.0.0.1:5000/api/v1/health
```

The expected health response is `{"success":true,"message":"Database connected"}`.
Do not show `.env` in the recording.

### Open the local PostgreSQL console

The inspected connection resolves to `ayushPortal` on loopback at port 5432.
The connection is configured in [database/db.js](../database/db.js#L1) and
[prisma7.config.js](../prisma7.config.js#L3); these files load the connection
from the environment rather than hard-coding credentials.

**Preparation terminal 3, also used during the screen recording:**

```bash
cd /Users/pratyushgupta/Desktop/majorProject
set -a
source .env
set +a
psql "$DATABASE_URL"
```

This uses the existing environment variable without printing or putting
credentials in the guide. In `psql`, confirm the target if desired:

```sql
SELECT current_database(), inet_server_addr(), inet_server_port();
```

Expected target: `ayushPortal`, loopback (`::1` or `127.0.0.1`), port `5432`.
List the actual tables with:

```text
\dt
```

### Optional Prisma Studio

Prisma Studio is available through the installed Prisma CLI and reads the
repository’s Prisma config. If you prefer its table browser, run this from the
project directory:

```bash
npx prisma studio
```

Studio is interactive and can edit data. For this demonstration, use it only
to browse; the SQL console is the better choice for showing joins and catalog
queries. Do not use the Studio URL option because it accepts a connection
string directly.

### Recording workflow

1. Record the narration first, reading only Section 1. Aim for about eight
   minutes and leave a brief pause between paragraphs.
2. Keep the backend running, open VS Code at the repository root, and keep a
   second terminal connected to `psql`.
3. Record the screen separately while following the synchronized section and
   timeline below. The screen pass is silent; do not rerecord the narration.
4. Start screen capture with the editor at the project root and a few seconds
   of neutral footage. Keep each file open before its narration interval starts.
5. Merge the screen recording with the voice track, align their starts, and
   trim the neutral footage at the beginning and end.

Use VS Code Quick Open (`Cmd+P`) to move between the exact file names below.
The Markdown links open each file at the referenced line.

## 3. Synchronized 8-minute script

### 00:00–00:20 | Introduction

**SAY:**

“Good morning. My name is Pratyush Gupta, and today I am presenting the
database management concepts in my project, Startup-AYUSH Portal. The portal
connects AYUSH startups, investors, incubators, mentors, government
stakeholders and other users.”

**SCREEN ACTION:**

1. Start on the project root in VS Code.
2. Briefly show the application entry point and its title/health route; do not
   open configuration secrets.

**FILES AND LINES:**

- [Open index.js — root route and portal response](../index.js#L22)

**TERMINAL COMMAND:** None during this interval.

### 00:20–01:05 | Project and database overview

**SAY:**

“The application uses PostgreSQL as its relational database and Prisma as its
database ORM. The schema contains users and stakeholder profiles, resources,
events, event registrations, community posts and comments. Primary keys
identify records, while foreign keys connect related records. The application
reads and writes this data through feature services. For example, it lists
events and resources, creates community posts, and handles event registration.”

**SCREEN ACTION:**

1. Open the Prisma database client setup and point to the PostgreSQL adapter.
2. Open the User model and briefly show its profile, event, resource and
   community relations.
3. Do not dwell on every model; the following section covers the important
   relationships.

**FILES AND LINES:**

- [Open database/db.js — Prisma PostgreSQL adapter](../database/db.js#L1)
- [Open User model and relations](../prisma/schema.prisma#L145)
- [Open community list and create operations](../modules/community/community.service.js#L16)
- [Open resource pagination and reads](../modules/resources/resources.service.js#L37)

**TERMINAL COMMAND:** The backend health check was run during preparation:

```bash
curl -fsS http://127.0.0.1:5000/api/v1/health
```

If showing its result, keep it on screen briefly and switch back to VS Code.

### 01:05–02:10 | Q1: Database selection and reasoning

**SAY:**

“PostgreSQL is a good fit because the data has clear relationships and needs
consistent updates. An event belongs to an organizer, and a user registers
for an event. A relational schema represents these links directly. PostgreSQL
also provides transactions, foreign keys, unique indexes and SQL joins. A
document database could store this information, but our related entities and
registration rules make a relational model a natural choice. This is a design
reasoning, not a claim that the project benchmarked multiple database
systems. The schema also uses enumerated values for roles, event types, event
status and resource categories. This makes the allowed values explicit and
keeps application records aligned with the domain choices.”

**SCREEN ACTION:**

1. Show `provider = "postgresql"` in the Prisma datasource.
2. Show that the runtime connection is built from `DATABASE_URL` through
   Prisma’s PostgreSQL adapter. Do not expose the variable value.
3. Briefly show the Event-to-User and EventRegistration-to-Event/User schema
   relations.

**FILES AND LINES:**

- [Open datasource provider](../prisma/schema.prisma#L5)
- [Open database/db.js — environment-based adapter setup](../database/db.js#L5)
- [Open event relations](../prisma/schema.prisma#L443)

**TERMINAL COMMAND:** None. Keep credentials hidden.

### 02:10–03:35 | Q2: Schema, ER relationships, keys and JOIN

**SAY:**

“In the schema, each User has a UUID primary key and a unique email. A
GovernmentProfile has a unique userId foreign key, so one user can have at
most one government profile. One user can have many community posts. Events
and users have a many-to-many relationship: EventRegistration is the junction
table. It stores eventId, userId, registrationStatus and createdAt, and its
eventId-userId pair is unique. Event also points to its organizer, Resource
points to its publisher, and Comment points both to its post and its author.
These are concrete foreign-key relationships, not just labels in an ER diagram.

I can demonstrate the relationships with a SQL join across EventRegistration,
Event and User. In the seeded local database, the join returns two rows for
the AYUSH Startup Incubation Workshop. Both registrations are marked
REGISTERED, and the rows show the two existing startup users. This is a live
database query; the application service uses Prisma relations rather than
embedding this particular SQL statement in the source.”

**SCREEN ACTION:**

1. Show `User.id` and `User.email @unique`.
2. Show `GovernmentProfile.userId @unique` and its `User` relation.
3. Show Event’s `organizerId` relation and its `registrations` collection.
4. Show EventRegistration’s two foreign keys and composite unique key.
5. Switch to `psql` and run the three-table JOIN below. Point to both returned
   rows and their registration status.

**FILES AND LINES:**

- [Open User primary key and unique email](../prisma/schema.prisma#L145)
- [Open GovernmentProfile one-to-one relation](../prisma/schema.prisma#L309)
- [Open Event model and organizer relation](../prisma/schema.prisma#L443)
- [Open EventRegistration junction model](../prisma/schema.prisma#L470)

**TERMINAL COMMAND — run in `psql`:**

```sql
SELECT
    e.title,
    u.name,
    er."registrationStatus"
FROM "EventRegistration" er
JOIN "Event" e ON er."eventId" = e.id
JOIN "User" u ON er."userId" = u.id;
```

The current verified output is two rows for the marked workshop:
`Profile Test Startup — REGISTERED` and `Test Startup — REGISTERED`.

### 03:35–04:45 | Q3: Normalization, 3NF and functional dependencies

**SAY:**

“For normalization, the core event and registration design stores each fact in
one appropriate place. User details stay in User, event details stay in Event,
and EventRegistration stores the relationship and registration-specific
status. This avoids repeating full user and event details in every
registration. The registration id determines its eventId, userId, status and
createdAt. The unique eventId-userId pair is also an alternate key for that
registration. Separating the details also reduces update anomalies: a user’s
name or an event’s title is stored with that entity rather than copied to each
registration. These choices support the goals of Third Normal Form for this
core relationship. I have not run a formal 3NF proof across every table, so I
describe this as a normalized design rather than a schema-wide certification.”

**SCREEN ACTION:**

1. Compare Event fields with EventRegistration fields: the registration
   contains keys and registration-specific fields, not copies of title/name.
2. Point to the registration primary key and unique event-user pair.
3. If time permits, show the SQL catalog query in Section 4 to verify the
   unique index in PostgreSQL.

**FILES AND LINES:**

- [Open Event attributes](../prisma/schema.prisma#L443)
- [Open EventRegistration key, status and timestamp](../prisma/schema.prisma#L470)
- [Open CommunityPost and Comment relations](../prisma/schema.prisma#L490)

**TERMINAL COMMAND:** None required in this interval.

### 04:45–06:05 | Q4: Constraints, transactions, atomicity and concurrency

**SAY:**

“Data integrity is protected at more than one level. The database defines
primary keys, foreign keys, unique email and a unique eventId-userId index.
The event API also validates fields such as event type, dates and positive
capacity. During registration, the service checks that the event is published,
that the deadline has not passed, that the event has not started, and that
capacity remains. If capacity is null, the service skips the numeric capacity
limit. The event row lock is scoped to one event, rather than locking the whole
registration table, so requests for different events do not need that same
row lock.

The registration service wraps these checks and the registration write in a
Prisma transaction. Before checking capacity, it runs PostgreSQL SELECT FOR
UPDATE on the event row. Concurrent registrations for the same event therefore
wait on that row lock and recheck the registered count in the transaction.
This helps prevent the available capacity from being exceeded. If a check or
write fails, the transaction does not commit a partial registration. The seed
data itself was inserted directly through Prisma in a separate transaction;
it did not call the application registration endpoint.”

**SCREEN ACTION:**

1. Show the Zod create-event validation, including date and positive-capacity
   rules.
2. Open the locking helper and point to `FOR UPDATE`.
3. Open `register()` and move through transaction start, event/deadline
   checks, duplicate/capacity checks, and create/update.
4. Emphasize that the transaction is an application-service feature. The
   database schema itself does not declare a capacity `CHECK` constraint.
5. Do not run registration or edit database rows during recording.

**FILES AND LINES:**

- [Open event request validation](../modules/events/events.validation.js#L7)
- [Open event row lock](../modules/events/events.service.js#L31)
- [Open registration transaction and checks](../modules/events/events.service.js#L124)
- [Open seed transaction for comparison](../scripts/seed-viva-demo.js#L91)

**TERMINAL COMMAND:** No write command. Keep `psql` read-only for the
demonstration queries.

### 06:05–07:45 | Q5: Indexes, write overhead and 100× workload

**SAY:**

“Indexes support the query patterns we have today. Event has indexes on
startDate and on status with startDate. EventRegistration has a unique
eventId-userId index and an index on userId. CommunityPost has indexes on
createdAt and status with createdAt; Comment has an index on postId with
createdAt; Resource has indexes on category and publishedAt. Indexes can
reduce lookup and sorting work, but they consume storage and add work to
inserts, updates and deletes. Also, an index does not automatically speed up
every search expression. The event list applies sorting and pagination, while
resource and community lists also use pagination. When investigating a slow
query, I would check its actual filter, sort order and query plan before
deciding whether a new index will help.

If workload grew to one hundred times its current level, I would first
measure the actual read and write mix, query plans, latency and database
resource use. The viva seed contains only a few demonstration rows, so it is
not a performance benchmark. I would tune or add indexes only for measured
bottlenecks, then review connection-pool settings and database capacity.
Read replicas could help if reads dominate and replication lag is acceptable.
Partitioning would need a clear large-table or retention use case. This
repository does not currently implement replicas, partitioning, sharding or
explicit pool tuning.”

**SCREEN ACTION:**

1. Show the Event and EventRegistration index declarations.
2. Show CommunityPost, Comment and Resource index declarations.
3. Switch to `psql` and run the index catalog query from Section 4.
4. Point out the unique registration index and distinguish it from the
   non-unique lookup indexes.
5. Do not claim the demo data measures production performance or that future
   scaling mechanisms already exist.

**FILES AND LINES:**

- [Open Event and EventRegistration indexes](../prisma/schema.prisma#L443)
- [Open CommunityPost and Comment indexes](../prisma/schema.prisma#L490)
- [Open Resource indexes](../prisma/schema.prisma#L420)
- [Open event listing and pagination](../modules/events/events.service.js#L40)
- [Open resource listing and pagination](../modules/resources/resources.service.js#L127)

**TERMINAL COMMAND — run in `psql`:**

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'Event', 'EventRegistration', 'CommunityPost', 'Comment', 'Resource'
  )
ORDER BY tablename, indexname;
```

### 07:45–08:00 | Conclusion

**SAY:**

“To conclude, PostgreSQL gives this project relational integrity, transactions
and indexes, while Prisma provides the application’s database access layer.
Thank you.”

**SCREEN ACTION:**

1. Return to the database adapter briefly, then end on the project root.
2. Leave a few seconds of still footage for a clean edit.

**FILE AND LINES:**

- [Open database client configuration](../database/db.js#L1)

**TERMINAL COMMAND:** None.

## 4. SQL queries for the screen recording

Connect using the preparation command above. These queries are read-only and
were checked against the actual PostgreSQL schema. The fixed IDs below are
from the current seed script.

### A. Show the demo event

```sql
SELECT
    e.id,
    e.title,
    e."eventType",
    e.location,
    e."startDate",
    e."registrationDeadline",
    e.capacity,
    e.status,
    organizer.name AS organizer
FROM "Event" e
JOIN "User" organizer ON organizer.id = e."organizerId"
WHERE e.id = '70000000-0000-0000-0000-000000000002';
```

**Verified:** one published `WORKSHOP`, titled
`[VIVA-DEMO-AYUSH-2026] AYUSH Startup Incubation Workshop`, capacity 50.

### B. Show the registration table rows

```sql
SELECT id, "eventId", "userId", "registrationStatus", "createdAt"
FROM "EventRegistration"
WHERE "eventId" = '70000000-0000-0000-0000-000000000002'
ORDER BY id;
```

**Verified:** two `REGISTERED` rows.

### C. Three-table JOIN

```sql
SELECT
    e.title,
    u.name,
    er."registrationStatus"
FROM "EventRegistration" er
JOIN "Event" e ON er."eventId" = e.id
JOIN "User" u ON er."userId" = u.id;
```

**Verified output:** two rows for the demo event. User names are
`Profile Test Startup` and `Test Startup`; both statuses are `REGISTERED`.

### D. Community posts and authors

```sql
SELECT p.id, p.content, u.name AS author, p.status, p."createdAt"
FROM "CommunityPost" p
JOIN "User" u ON u.id = p."userId"
WHERE p.id IN (
    '70000000-0000-0000-0000-000000000005',
    '70000000-0000-0000-0000-000000000006'
)
ORDER BY p.id;
```

**Verified:** two `ACTIVE` posts, authored by the two startup users.

### E. Comments, authors and associated posts

```sql
SELECT
    c.id,
    p.content AS post,
    author.name AS comment_author,
    c.content AS comment,
    c."createdAt"
FROM "Comment" c
JOIN "CommunityPost" p ON p.id = c."postId"
JOIN "User" author ON author.id = c."userId"
WHERE c.id IN (
    '70000000-0000-0000-0000-000000000007',
    '70000000-0000-0000-0000-000000000008'
)
ORDER BY c.id;
```

**Verified:** two comments, one for each seeded post.

### F. Resource categories and publishers

```sql
SELECT r.id, r.title, r.category, u.name AS publisher, u.role
FROM "Resource" r
JOIN "User" u ON u.id = r."publisherId"
WHERE r.id IN (
    '70000000-0000-0000-0000-000000000009',
    '70000000-0000-0000-0000-00000000000a'
)
ORDER BY r.id;
```

**Verified:** two resources with categories `GOVERNMENT_SCHEME` and `RESEARCH`,
published by the marked Government demo user.

### G. Constraints and foreign keys

```sql
SELECT
    t.relname AS table_name,
    c.conname,
    c.contype,
    pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN (
      'Event', 'EventRegistration', 'User', 'GovernmentProfile',
      'CommunityPost', 'Comment', 'Resource'
  )
ORDER BY t.relname, c.contype, c.conname;
```

`contype` values include `p` for primary key and `f` for foreign key. In this
database, the EventRegistration event-user uniqueness is represented in
`pg_indexes` as a unique index.

### H. Index catalog

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'Event', 'EventRegistration', 'CommunityPost', 'Comment', 'Resource'
  )
ORDER BY tablename, indexname;
```

**Verified relevant names:** `Event_startDate_idx`,
`Event_status_startDate_idx`, `EventRegistration_eventId_userId_key`,
`EventRegistration_userId_idx`, `CommunityPost_createdAt_idx`,
`CommunityPost_status_createdAt_idx`, `Comment_postId_createdAt_idx`,
`Resource_category_idx` and `Resource_publishedAt_idx`.

### I. Current record counts

Use this only if asked to verify counts. It reports demo entities by their
fixed seed IDs, not by assumed output:

```sql
SELECT
    (SELECT count(*) FROM "User") AS all_users,
    (SELECT count(*) FROM "GovernmentProfile"
      WHERE "userId" = '70000000-0000-0000-0000-000000000001') AS demo_government_profiles,
    (SELECT count(*) FROM "Event"
      WHERE id = '70000000-0000-0000-0000-000000000002') AS demo_events,
    (SELECT count(*) FROM "EventRegistration"
      WHERE "eventId" = '70000000-0000-0000-0000-000000000002') AS demo_registrations,
    (SELECT count(*) FROM "CommunityPost"
      WHERE id IN (
        '70000000-0000-0000-0000-000000000005',
        '70000000-0000-0000-0000-000000000006'
      )) AS demo_posts,
    (SELECT count(*) FROM "Comment"
      WHERE id IN (
        '70000000-0000-0000-0000-000000000007',
        '70000000-0000-0000-0000-000000000008'
      )) AS demo_comments,
    (SELECT count(*) FROM "Resource"
      WHERE id IN (
        '70000000-0000-0000-0000-000000000009',
        '70000000-0000-0000-0000-00000000000a'
      )) AS demo_resources;
```

**Verified when this guide was prepared:** 5 total users, 1 demo
GovernmentProfile, 1 demo event, 2 registrations, 2 posts, 2 comments and 2
resources. The total includes the four pre-existing users and the one
seed-created organizer.

## 5. Exact eight-minute screen timeline

The screen pass is silent. The “What I SAY” column identifies the matching
pre-recorded narration. Pre-open each file before its interval; the short
switching pauses are included in each interval.

| Timestamp | What I SAY | What I SHOW | File and line numbers | Terminal command |
|---|---|---|---|---|
| 00:00–00:20 | Introduction and stakeholder purpose | Project root, then the root API response | [index.js](../index.js#L22) | None |
| 00:20–01:05 | PostgreSQL, Prisma and main entities | Adapter, User relations, one read service | [database/db.js](../database/db.js#L1); [schema.prisma](../prisma/schema.prisma#L145); [community.service.js](../modules/community/community.service.js#L16) | Optional health check already run: `curl -fsS http://127.0.0.1:5000/api/v1/health` |
| 01:05–02:10 | Why relational PostgreSQL fits | Datasource and event relationships | [schema.prisma](../prisma/schema.prisma#L5); [database/db.js](../database/db.js#L5); [schema.prisma](../prisma/schema.prisma#L443) | None |
| 02:10–03:35 | One-to-one, one-to-many, junction table and JOIN | User → GovernmentProfile → Event → EventRegistration; then show two JOIN rows | [schema.prisma](../prisma/schema.prisma#L145); [schema.prisma](../prisma/schema.prisma#L309); [schema.prisma](../prisma/schema.prisma#L443); [schema.prisma](../prisma/schema.prisma#L470) | Run SQL C in `psql` |
| 03:35–04:45 | Normalization, 3NF scope and functional dependencies | Event and registration attributes, unique key | [schema.prisma](../prisma/schema.prisma#L443); [schema.prisma](../prisma/schema.prisma#L470) | None |
| 04:45–06:05 | Constraints, validation, transaction, lock and atomicity | Validation, `FOR UPDATE`, full registration flow | [events.validation.js](../modules/events/events.validation.js#L7); [events.service.js](../modules/events/events.service.js#L31); [events.service.js](../modules/events/events.service.js#L124) | Do not run write commands |
| 06:05–07:45 | Indexes, trade-offs and 100× scale plan | Schema indexes, then catalog index output | [schema.prisma](../prisma/schema.prisma#L443); [schema.prisma](../prisma/schema.prisma#L490); [schema.prisma](../prisma/schema.prisma#L420) | Run SQL H in `psql` |
| 07:45–08:00 | Conclusion | Return to database adapter, then hold final screen | [database/db.js](../database/db.js#L1) | None |

## 6. Final checklist

### Backend preparation

- [ ] From the repository root, run `npm run dev` in a dedicated terminal.
- [ ] Confirm `http://127.0.0.1:5000/api/v1/health` responds successfully.
- [ ] Keep `.env` closed and do not display environment values.
- [ ] Do not restart or migrate the database for the recording.

### Database preparation

- [ ] Connect with `psql "$DATABASE_URL"` after sourcing `.env`.
- [ ] Verify `ayushPortal` and loopback with the read-only target query.
- [ ] Confirm the current demo event and two registration rows are present.
- [ ] Do not run the seed again unless the records are missing; it is
  idempotent, but the recording already has prepared data.
- [ ] Do not run the cleanup script before or during the viva.
- [ ] Do not insert, update, delete, truncate or reset database data during the
  demonstration.

### Files to open before screen recording

1. [index.js](../index.js#L22)
2. [database/db.js](../database/db.js#L1)
3. [prisma/schema.prisma — User](../prisma/schema.prisma#L145)
4. [prisma/schema.prisma — GovernmentProfile](../prisma/schema.prisma#L309)
5. [prisma/schema.prisma — Event and EventRegistration](../prisma/schema.prisma#L443)
6. [modules/events/events.validation.js](../modules/events/events.validation.js#L7)
7. [modules/events/events.service.js — lock and registration](../modules/events/events.service.js#L31)
8. [prisma/schema.prisma — community and resource indexes](../prisma/schema.prisma#L420)
9. Keep a second terminal connected to `psql`.

### Terminal commands to keep ready

```bash
cd /Users/pratyushgupta/Desktop/majorProject
npm run dev
```

```bash
curl -fsS http://127.0.0.1:5000/api/v1/health
```

```bash
cd /Users/pratyushgupta/Desktop/majorProject
set -a
source .env
set +a
psql "$DATABASE_URL"
```

Optional browser-based table viewer, not needed for the planned SQL demo:

```bash
npx prisma studio
```

### SQL queries to keep ready

- [ ] A — demo event
- [ ] B — event registrations
- [ ] C — three-table JOIN
- [ ] D — posts and authors
- [ ] E — comments and associated authors/posts
- [ ] F — resource category and publisher
- [ ] G — constraints and foreign keys
- [ ] H — indexes

### Final video recording checklist

- [ ] Record the voice track first from Section 1 only.
- [ ] Keep the narration near eight minutes; speak clearly rather than racing.
- [ ] Record the screen separately and follow the timestamps in order.
- [ ] Keep file-switching pauses inside their time windows.
- [ ] Show actual query output, not typed or fabricated sample output.
- [ ] Merge the two tracks, align their starts and trim the opening/ending
  buffer.
- [ ] Verify the final video has audible narration and readable source/SQL.

### Avoid claiming

- [ ] Do not say the project formally proves every table is in 3NF; no
  schema-wide 3NF proof was found.
- [ ] Do not say the seed calls the event registration API; it inserts demo
  rows directly through Prisma in a transaction.
- [ ] Do not say capacity is protected by a database `CHECK` constraint; the
  service checks capacity inside a transaction after locking the Event row.
- [ ] Do not say replicas, sharding, partitioning or explicit pool tuning are
  already implemented.
- [ ] Do not say every index accelerates every filter; for example, the event
  search uses case-insensitive `contains`, which may need separate tuning if
  it becomes a measured bottleneck.
- [ ] Do not present the small viva seed as a load test or performance result.
