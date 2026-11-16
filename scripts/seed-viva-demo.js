require("dotenv/config");

const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { URL } = require("node:url");

const CONFIRMATION = "VIVA_DEMO_CONFIRM_LOCAL_DB";
const DATABASE_NAME = "ayushPortal";
const ORGANIZER_ID = "70000000-0000-0000-0000-000000000001";
const ORGANIZER_EMAIL = "viva-demo-organizer@example.test";
const EVENT_ID = "70000000-0000-0000-0000-000000000002";
const REGISTRATION_IDS = [
  "70000000-0000-0000-0000-000000000003",
  "70000000-0000-0000-0000-000000000004",
];
const POST_IDS = [
  "70000000-0000-0000-0000-000000000005",
  "70000000-0000-0000-0000-000000000006",
];
const COMMENT_IDS = [
  "70000000-0000-0000-0000-000000000007",
  "70000000-0000-0000-0000-000000000008",
];
const RESOURCE_IDS = [
  "70000000-0000-0000-0000-000000000009",
  "70000000-0000-0000-0000-00000000000a",
];
const MARKER = "[VIVA-DEMO-AYUSH-2026]";

function assertLocalDemoTarget() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const url = new URL(connectionString);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const database = decodeURIComponent(url.pathname.slice(1));

  if (process.env[CONFIRMATION] !== DATABASE_NAME) {
    throw new Error(
      `Refusing database changes. Confirm this local database by setting ${CONFIRMATION}=${DATABASE_NAME}.`
    );
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Refusing database changes: DATABASE_URL is not PostgreSQL.");
  }
  if (!loopbackHosts.has(url.hostname) || database !== DATABASE_NAME) {
    throw new Error(
      `Refusing database changes: expected local database ${DATABASE_NAME}, got host "${url.hostname}" and database "${database}".`
    );
  }
}

function assertMatches(record, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (record[key] !== value) {
      throw new Error(`Existing ${label} does not match the demo seed marker.`);
    }
  }
}

async function createIfMissing(delegate, id, data, expected, label) {
  const existing = await delegate.findUnique({ where: { id } });
  if (existing) {
    assertMatches(existing, expected, label);
    return false;
  }
  await delegate.create({ data });
  return true;
}

function serializeRows(rows) {
  return JSON.stringify(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value instanceof Date ? value.toISOString() : value,
        ])
      )
    )
  );
}

async function main() {
  assertLocalDemoTarget();
  const { prisma } = require("../database/db");

  try {
    const counts = await prisma.$transaction(async (tx) => {
      const beforeUsers = await tx.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      });

      const attendees = await tx.user.findMany({
        where: {
          status: "ACTIVE",
          role: { in: ["STARTUP", "MENTOR"] },
          id: { not: ORGANIZER_ID },
        },
        select: { id: true, name: true, role: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 2,
      });
      if (attendees.length < 2) {
        throw new Error(
          "Need two existing ACTIVE STARTUP or MENTOR users; no demo data was committed."
        );
      }

      const beforeCounts = {
        user: await tx.user.count(),
        governmentProfile: await tx.governmentProfile.count(),
        event: await tx.event.count(),
        eventRegistration: await tx.eventRegistration.count(),
        communityPost: await tx.communityPost.count(),
        comment: await tx.comment.count(),
        resource: await tx.resource.count(),
      };

      const organizerById = await tx.user.findUnique({
        where: { id: ORGANIZER_ID },
      });
      const organizerByEmail = await tx.user.findUnique({
        where: { email: ORGANIZER_EMAIL },
      });
      if (organizerByEmail && organizerByEmail.id !== ORGANIZER_ID) {
        throw new Error("The demo organizer email is already used by another user.");
      }

      let organizerCreated = false;
      if (organizerById) {
        assertMatches(
          organizerById,
          {
            id: ORGANIZER_ID,
            name: `${MARKER} Government Organizer`,
            email: ORGANIZER_EMAIL,
            role: "GOVERNMENT",
          },
          "organizer"
        );
      } else {
        const passwordHash = await bcrypt.hash(
          crypto.randomBytes(32).toString("base64"),
          12
        );
        await tx.user.create({
          data: {
            id: ORGANIZER_ID,
            name: `${MARKER} Government Organizer`,
            email: ORGANIZER_EMAIL,
            passwordHash,
            role: "GOVERNMENT",
            status: "ACTIVE",
          },
        });
        organizerCreated = true;
      }

      const profile = await tx.governmentProfile.findUnique({
        where: { userId: ORGANIZER_ID },
      });
      let profileCreated = false;
      if (profile) {
        assertMatches(
          profile,
          {
            userId: ORGANIZER_ID,
            departmentName: `${MARKER} AYUSH Demo Department`,
            verificationStatus: "VERIFIED",
          },
          "government profile"
        );
      } else {
        await tx.governmentProfile.create({
          data: {
            userId: ORGANIZER_ID,
            departmentName: `${MARKER} AYUSH Demo Department`,
            description: "Local-only publisher for viva demonstration data.",
            verificationStatus: "VERIFIED",
          },
        });
        profileCreated = true;
      }

      const starts = new Date();
      starts.setDate(starts.getDate() + 90);
      starts.setMinutes(0, 0, 0);
      const ends = new Date(starts.getTime() + 2 * 60 * 60 * 1000);
      const deadline = new Date(starts.getTime() - 24 * 60 * 60 * 1000);
      const eventTitle = `${MARKER} AYUSH Startup Incubation Workshop`;
      const eventCreated = await createIfMissing(
        tx.event,
        EVENT_ID,
        {
          id: EVENT_ID,
          organizerId: ORGANIZER_ID,
          title: eventTitle,
          description:
            "A practical workshop on clinical validation, regulatory pathways and incubation support for AYUSH startups.",
          eventType: "WORKSHOP",
          location: "New Delhi",
          startDate: starts,
          endDate: ends,
          registrationDeadline: deadline,
          capacity: 50,
          status: "PUBLISHED",
        },
        {
          id: EVENT_ID,
          organizerId: ORGANIZER_ID,
          title: eventTitle,
          status: "PUBLISHED",
        },
        "event"
      );

      let registrationsCreated = 0;
      for (let i = 0; i < attendees.length; i += 1) {
        const id = REGISTRATION_IDS[i];
        const attendee = attendees[i];
        const existing = await tx.eventRegistration.findUnique({
          where: { id },
        });
        const uniqueRegistration = await tx.eventRegistration.findUnique({
          where: {
            eventId_userId: { eventId: EVENT_ID, userId: attendee.id },
          },
        });
        if (existing) {
          assertMatches(
            existing,
            {
              id,
              eventId: EVENT_ID,
              userId: attendee.id,
              registrationStatus: "REGISTERED",
            },
            "event registration"
          );
        } else if (uniqueRegistration) {
          throw new Error(
            "A registration already exists for a demo attendee but is not owned by the demo seed."
          );
        } else {
          await tx.eventRegistration.create({
            data: {
              id,
              eventId: EVENT_ID,
              userId: attendee.id,
              registrationStatus: "REGISTERED",
            },
          });
          registrationsCreated += 1;
        }
      }

      const postContents = [
        `${MARKER} Our team is exploring quality standards for a new AYUSH wellness product. What validation steps should an early-stage startup prioritize?`,
        `${MARKER} We are looking for incubation guidance on regulatory readiness and responsible evidence generation for AYUSH innovations.`,
      ];
      let postsCreated = 0;
      for (let i = 0; i < POST_IDS.length; i += 1) {
        postsCreated += Number(
          await createIfMissing(
            tx.communityPost,
            POST_IDS[i],
            {
              id: POST_IDS[i],
              userId: attendees[i].id,
              content: postContents[i],
              status: "ACTIVE",
            },
            {
              id: POST_IDS[i],
              userId: attendees[i].id,
              content: postContents[i],
              status: "ACTIVE",
            },
            "community post"
          )
        );
      }

      const commentContents = [
        `${MARKER} Consider documenting the formulation, intended use and evidence plan before approaching an incubator.`,
        `${MARKER} A mentor or incubator can help map the applicable quality and regulatory requirements.`,
      ];
      let commentsCreated = 0;
      for (let i = 0; i < COMMENT_IDS.length; i += 1) {
        commentsCreated += Number(
          await createIfMissing(
            tx.comment,
            COMMENT_IDS[i],
            {
              id: COMMENT_IDS[i],
              postId: POST_IDS[i],
              userId: attendees[1 - i].id,
              content: commentContents[i],
            },
            {
              id: COMMENT_IDS[i],
              postId: POST_IDS[i],
              userId: attendees[1 - i].id,
              content: commentContents[i],
            },
            "comment"
          )
        );
      }

      const resourceData = [
        {
          id: RESOURCE_IDS[0],
          title: `${MARKER} AYUSH Startup Scheme Information`,
          description:
            "A demonstration resource directing users to the Ministry of AYUSH portal for current schemes and notices.",
          category: "GOVERNMENT_SCHEME",
          sourceUrl: "https://ayush.gov.in/",
          publisherId: ORGANIZER_ID,
        },
        {
          id: RESOURCE_IDS[1],
          title: `${MARKER} AYUSH Research and Evidence Portal`,
          description:
            "A demonstration resource for exploring AYUSH research and evidence information.",
          category: "RESEARCH",
          sourceUrl: "https://ayush.gov.in/",
          publisherId: ORGANIZER_ID,
        },
      ];
      let resourcesCreated = 0;
      for (const data of resourceData) {
        resourcesCreated += Number(
          await createIfMissing(
            tx.resource,
            data.id,
            data,
            {
              id: data.id,
              title: data.title,
              publisherId: ORGANIZER_ID,
            },
            "resource"
          )
        );
      }

      const afterUsers = await tx.user.findMany({
        where: { id: { in: beforeUsers.map((user) => user.id) } },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      });
      if (serializeRows(beforeUsers) !== serializeRows(afterUsers)) {
        throw new Error("Existing users changed; rolling back the demo seed.");
      }

      const afterCounts = {
        user: await tx.user.count(),
        governmentProfile: await tx.governmentProfile.count(),
        event: await tx.event.count(),
        eventRegistration: await tx.eventRegistration.count(),
        communityPost: await tx.communityPost.count(),
        comment: await tx.comment.count(),
        resource: await tx.resource.count(),
      };
      const expectedCounts = {
        user: beforeCounts.user + Number(organizerCreated),
        governmentProfile:
          beforeCounts.governmentProfile + Number(profileCreated),
        event: beforeCounts.event + Number(eventCreated),
        eventRegistration:
          beforeCounts.eventRegistration + registrationsCreated,
        communityPost: beforeCounts.communityPost + postsCreated,
        comment: beforeCounts.comment + commentsCreated,
        resource: beforeCounts.resource + resourcesCreated,
      };
      if (JSON.stringify(afterCounts) !== JSON.stringify(expectedCounts)) {
        throw new Error("Unexpected table count changes; rolling back the demo seed.");
      }

      const verifiedEvent = await tx.event.findUnique({
        where: { id: EVENT_ID },
        select: { id: true, title: true, organizer: { select: { name: true } } },
      });
      const verifiedRegistrations = await tx.eventRegistration.findMany({
        where: { eventId: EVENT_ID, registrationStatus: "REGISTERED" },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: "asc" },
      });
      const verifiedPosts = await tx.communityPost.count({
        where: { id: { in: POST_IDS }, content: { startsWith: MARKER } },
      });
      const verifiedComments = await tx.comment.count({
        where: { id: { in: COMMENT_IDS }, content: { startsWith: MARKER } },
      });
      const verifiedResources = await tx.resource.count({
        where: { id: { in: RESOURCE_IDS }, title: { startsWith: MARKER } },
      });
      if (
        !verifiedEvent ||
        verifiedRegistrations.length !== 2 ||
        verifiedPosts !== 2 ||
        verifiedComments !== 2 ||
        verifiedResources !== 2
      ) {
        throw new Error("Prisma verification failed; rolling back the demo seed.");
      }

      return {
        organizerCreated,
        profileCreated,
        eventCreated,
        registrationsCreated,
        postsCreated,
        commentsCreated,
        resourcesCreated,
        eventTitle: verifiedEvent.title,
        organizerName: verifiedEvent.organizer.name,
        registrations: verifiedRegistrations.map(({ user }) => user.name),
        existingUsersUnchanged: beforeUsers.length,
      };
    });

    console.log("Viva demo seed verified:", JSON.stringify(counts, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Viva demo seed failed:", error.message);
  process.exitCode = 1;
});
