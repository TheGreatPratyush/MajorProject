require("dotenv/config");

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
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const url = new URL(connectionString);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const database = decodeURIComponent(url.pathname.slice(1));

  if (process.env[CONFIRMATION] !== DATABASE_NAME) {
    throw new Error(
      `Refusing database changes. Confirm this local database by setting ${CONFIRMATION}=${DATABASE_NAME}.`
    );
  }
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !loopbackHosts.has(url.hostname) ||
    database !== DATABASE_NAME
  ) {
    throw new Error(
      `Refusing database changes: expected local database ${DATABASE_NAME}, got host "${url.hostname}" and database "${database}".`
    );
  }
}

function assertMatches(record, expected, label) {
  if (!record) return;
  for (const [key, value] of Object.entries(expected)) {
    if (record[key] !== value) {
      throw new Error(`Refusing cleanup: ${label} does not match the demo marker.`);
    }
  }
}

async function main() {
  assertLocalDemoTarget();
  const { prisma } = require("../database/db");

  try {
    const removed = await prisma.$transaction(async (tx) => {
      const organizer = await tx.user.findUnique({
        where: { id: ORGANIZER_ID },
      });
      const event = await tx.event.findUnique({ where: { id: EVENT_ID } });
      assertMatches(
        organizer,
        {
          id: ORGANIZER_ID,
          name: `${MARKER} Government Organizer`,
          email: ORGANIZER_EMAIL,
          role: "GOVERNMENT",
        },
        "organizer"
      );
      assertMatches(
        event,
        {
          id: EVENT_ID,
          organizerId: ORGANIZER_ID,
          title: `${MARKER} AYUSH Startup Incubation Workshop`,
        },
        "event"
      );

      for (let i = 0; i < REGISTRATION_IDS.length; i += 1) {
        const registration = await tx.eventRegistration.findUnique({
          where: { id: REGISTRATION_IDS[i] },
        });
        if (registration) {
          assertMatches(
            registration,
            {
              id: REGISTRATION_IDS[i],
              eventId: EVENT_ID,
              registrationStatus: "REGISTERED",
            },
            "registration"
          );
        }
      }
      for (let i = 0; i < POST_IDS.length; i += 1) {
        const post = await tx.communityPost.findUnique({
          where: { id: POST_IDS[i] },
        });
        if (post) {
          if (!post.content.startsWith(MARKER)) {
            throw new Error("Refusing cleanup: community post is not demo data.");
          }
        }
      }
      for (let i = 0; i < COMMENT_IDS.length; i += 1) {
        const comment = await tx.comment.findUnique({
          where: { id: COMMENT_IDS[i] },
        });
        if (comment) {
          if (
            comment.postId !== POST_IDS[i] ||
            !comment.content.startsWith(MARKER)
          ) {
            throw new Error("Refusing cleanup: comment is not demo data.");
          }
        }
      }
      for (const id of RESOURCE_IDS) {
        const resource = await tx.resource.findUnique({ where: { id } });
        if (resource) {
          if (
            resource.publisherId !== ORGANIZER_ID ||
            !resource.title.startsWith(MARKER)
          ) {
            throw new Error("Refusing cleanup: resource is not demo data.");
          }
        }
      }

      const registrations = await tx.eventRegistration.findMany({
        where: { eventId: EVENT_ID },
        select: { id: true },
      });
      if (
        registrations.some(({ id }) => !REGISTRATION_IDS.includes(id)) ||
        registrations.length > REGISTRATION_IDS.length
      ) {
        throw new Error(
          "Refusing cleanup: this event has registrations not created by the demo seed."
        );
      }
      for (const postId of POST_IDS) {
        const comments = await tx.comment.findMany({
          where: { postId },
          select: { id: true },
        });
        if (comments.some(({ id }) => !COMMENT_IDS.includes(id))) {
          throw new Error(
            "Refusing cleanup: a demo post has comments not created by the demo seed."
          );
        }
      }

      if (organizer) {
        const dependencies = await Promise.all([
          tx.connectionRequest.count({
            where: { OR: [{ senderId: ORGANIZER_ID }, { receiverId: ORGANIZER_ID }] },
          }),
          tx.mentorshipApplication.count({
            where: { OR: [{ applicantId: ORGANIZER_ID }, { mentorId: ORGANIZER_ID }] },
          }),
          tx.incubationProgram.count({ where: { ownerId: ORGANIZER_ID } }),
          tx.programApplication.count({ where: { startupId: ORGANIZER_ID } }),
          tx.event.count({
            where: { organizerId: ORGANIZER_ID, id: { not: EVENT_ID } },
          }),
          tx.eventRegistration.count({
            where: { userId: ORGANIZER_ID, id: { notIn: REGISTRATION_IDS } },
          }),
          tx.communityPost.count({
            where: { userId: ORGANIZER_ID, id: { notIn: POST_IDS } },
          }),
          tx.comment.count({
            where: { userId: ORGANIZER_ID, id: { notIn: COMMENT_IDS } },
          }),
          tx.resource.count({
            where: { publisherId: ORGANIZER_ID, id: { notIn: RESOURCE_IDS } },
          }),
          tx.session.count({ where: { userId: ORGANIZER_ID } }),
          tx.notification.count({ where: { userId: ORGANIZER_ID } }),
          tx.auditLog.count({ where: { actorId: ORGANIZER_ID } }),
          tx.startupProfile.count({ where: { userId: ORGANIZER_ID } }),
          tx.investorProfile.count({ where: { userId: ORGANIZER_ID } }),
          tx.mentorProfile.count({ where: { userId: ORGANIZER_ID } }),
          tx.incubatorProfile.count({ where: { userId: ORGANIZER_ID } }),
          tx.acceleratorProfile.count({ where: { userId: ORGANIZER_ID } }),
        ]);
        if (dependencies.some((count) => count !== 0)) {
          throw new Error(
            "Refusing cleanup: the demo organizer has additional related records."
          );
        }
      }

      const profile = await tx.governmentProfile.findUnique({
        where: { userId: ORGANIZER_ID },
      });
      assertMatches(
        profile,
        {
          userId: ORGANIZER_ID,
          departmentName: `${MARKER} AYUSH Demo Department`,
          verificationStatus: "VERIFIED",
        },
        "government profile"
      );

      const commentResult = await tx.comment.deleteMany({
        where: { id: { in: COMMENT_IDS }, content: { startsWith: MARKER } },
      });
      const postResult = await tx.communityPost.deleteMany({
        where: { id: { in: POST_IDS }, content: { startsWith: MARKER } },
      });
      const registrationResult = await tx.eventRegistration.deleteMany({
        where: {
          id: { in: REGISTRATION_IDS },
          eventId: EVENT_ID,
          registrationStatus: "REGISTERED",
        },
      });
      const resourceResult = await tx.resource.deleteMany({
        where: {
          id: { in: RESOURCE_IDS },
          publisherId: ORGANIZER_ID,
          title: { startsWith: MARKER },
        },
      });
      const eventResult = await tx.event.deleteMany({
        where: {
          id: EVENT_ID,
          organizerId: ORGANIZER_ID,
          title: `${MARKER} AYUSH Startup Incubation Workshop`,
        },
      });
      const profileResult = await tx.governmentProfile.deleteMany({
        where: {
          userId: ORGANIZER_ID,
          departmentName: `${MARKER} AYUSH Demo Department`,
        },
      });
      const userResult = await tx.user.deleteMany({
        where: {
          id: ORGANIZER_ID,
          email: ORGANIZER_EMAIL,
          name: `${MARKER} Government Organizer`,
          role: "GOVERNMENT",
        },
      });

      return {
        comments: commentResult.count,
        posts: postResult.count,
        registrations: registrationResult.count,
        resources: resourceResult.count,
        events: eventResult.count,
        governmentProfiles: profileResult.count,
        users: userResult.count,
      };
    });

    console.log("Only verified viva demo records were removed:", JSON.stringify(removed, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Viva demo cleanup failed:", error.message);
  process.exitCode = 1;
});
