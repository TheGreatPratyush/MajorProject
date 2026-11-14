const {
  ConnectionStatus,
  MentorshipStatus,
  ProgramStatus,
  ProgramApplicationStatus,
  EventStatus,
} = require("@prisma/client");
const { prisma } = require("../../database/db");

class DashboardError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "DashboardError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const USER_SUMMARY = { id: true, name: true, role: true };

// Profile relation per role. hasVerification is false for models
// that have no verificationStatus column.
const PROFILE_MODELS = {
  STARTUP: { model: "startupProfile", hasVerification: true },
  INVESTOR: { model: "investorProfile", hasVerification: false },
  MENTOR: { model: "mentorProfile", hasVerification: false },
  INCUBATOR: { model: "incubatorProfile", hasVerification: true },
  ACCELERATOR: { model: "acceleratorProfile", hasVerification: true },
  GOVERNMENT: { model: "governmentProfile", hasVerification: true },
};

function assertDashboardRole(user) {
  // Decision L5 (pending): the admin dashboard belongs to Phase 9.
  if (user.role === "ADMIN") {
    throw new DashboardError(403, "Admin dashboard is provided by Phase 9.");
  }
}

// Returns every enum value as a key, with 0 where there are no rows.
async function countByStatus(model, field, where, enumObject) {
  const groups = await prisma[model].groupBy({
    by: [field],
    where,
    _count: { _all: true },
  });

  const result = Object.fromEntries(
    Object.values(enumObject).map((value) => [value, 0])
  );

  for (const group of groups) {
    result[group[field]] = group._count._all;
  }

  return result;
}

async function getProfile(user) {
  const config = PROFILE_MODELS[user.role];

  if (!config) {
    return { exists: false, verificationStatus: null };
  }

  const profile = await prisma[config.model].findUnique({
    where: { userId: user.id },
    select: config.hasVerification
      ? { id: true, verificationStatus: true }
      : { id: true },
  });

  return {
    exists: Boolean(profile),
    verificationStatus: profile?.verificationStatus ?? null,
  };
}

async function getCommonMetrics(user) {
  const [unread, pendingReceived, pendingSent, accepted, activeRegistrations, posts] =
    await Promise.all([
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      prisma.connectionRequest.count({
        where: { receiverId: user.id, status: ConnectionStatus.PENDING },
      }),
      prisma.connectionRequest.count({
        where: { senderId: user.id, status: ConnectionStatus.PENDING },
      }),
      prisma.connectionRequest.count({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [{ senderId: user.id }, { receiverId: user.id }],
        },
      }),
      // Active = still registered for a published event that has not ended.
      prisma.eventRegistration.count({
        where: {
          userId: user.id,
          registrationStatus: "REGISTERED",
          event: { status: EventStatus.PUBLISHED, endDate: { gte: new Date() } },
        },
      }),
      prisma.communityPost.count({ where: { userId: user.id, status: "ACTIVE" } }),
    ]);

  return {
    notifications: { unread },
    connections: { pendingReceived, pendingSent, accepted },
    events: { activeRegistrations },
    community: { posts },
  };
}

async function getRoleMetrics(user) {
  switch (user.role) {
    case "STARTUP": {
      const [applications, mentorshipSent] = await Promise.all([
        countByStatus("programApplication", "status", { startupId: user.id }, ProgramApplicationStatus),
        countByStatus("mentorshipApplication", "status", { applicantId: user.id }, MentorshipStatus),
      ]);
      return {
        programApplications: { byStatus: applications },
        mentorship: { sent: { byStatus: mentorshipSent } },
      };
    }

    case "MENTOR": {
      const received = await countByStatus(
        "mentorshipApplication", "status", { mentorId: user.id }, MentorshipStatus
      );
      return { mentorship: { received: { byStatus: received } } };
    }

    case "INCUBATOR":
    case "ACCELERATOR": {
      const [programs, received, events] = await Promise.all([
        countByStatus("incubationProgram", "status", { ownerId: user.id }, ProgramStatus),
        countByStatus("programApplication", "status", { program: { ownerId: user.id } }, ProgramApplicationStatus),
        countByStatus("event", "status", { organizerId: user.id }, EventStatus),
      ]);
      return {
        programs: { byStatus: programs },
        programApplications: { received: { byStatus: received } },
        organizedEvents: { byStatus: events },
      };
    }

    case "GOVERNMENT": {
      const [published, events] = await Promise.all([
        prisma.resource.count({ where: { publisherId: user.id } }),
        countByStatus("event", "status", { organizerId: user.id }, EventStatus),
      ]);
      return {
        resources: { published },
        organizedEvents: { byStatus: events },
      };
    }

    default:
      // INVESTOR and PUBLIC only have the common block.
      return {};
  }
}

async function getSummary(user) {
  assertDashboardRole(user);

  const [profile, common, roleMetrics] = await Promise.all([
    getProfile(user),
    getCommonMetrics(user),
    getRoleMetrics(user),
  ]);

  return {
    role: user.role,
    profile,
    metrics: { ...common, ...roleMetrics },
  };
}

// ------------------------------------------
// Activity feed
// ------------------------------------------
// Each source returns at most `limit` rows; the merged list is sorted
// and trimmed, so the result is the caller's `limit` latest records.

async function getActivity(user, { limit }) {
  assertDashboardRole(user);

  const [connections, mentorships, applications, registrations] = await Promise.all([
    prisma.connectionRequest.findMany({
      where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
      select: {
        id: true,
        status: true,
        senderId: true,
        updatedAt: true,
        sender: { select: USER_SUMMARY },
        receiver: { select: USER_SUMMARY },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.mentorshipApplication.findMany({
      where: { OR: [{ applicantId: user.id }, { mentorId: user.id }] },
      select: {
        id: true,
        status: true,
        applicantId: true,
        updatedAt: true,
        applicant: { select: USER_SUMMARY },
        mentor: { select: USER_SUMMARY },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.programApplication.findMany({
      where: { OR: [{ startupId: user.id }, { program: { ownerId: user.id } }] },
      select: {
        id: true,
        status: true,
        startupId: true,
        updatedAt: true,
        startup: { select: USER_SUMMARY },
        program: { select: { programName: true, owner: { select: USER_SUMMARY } } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    // EventRegistration has no updatedAt column, so createdAt is used.
    prisma.eventRegistration.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        registrationStatus: true,
        createdAt: true,
        event: { select: { title: true, organizer: { select: USER_SUMMARY } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const items = [
    ...connections.map((row) => {
      const sent = row.senderId === user.id;
      return {
        kind: "CONNECTION",
        id: row.id,
        status: row.status,
        title: sent ? "Connection request sent" : "Connection request received",
        counterpart: sent ? row.receiver : row.sender,
        updatedAt: row.updatedAt,
      };
    }),
    ...mentorships.map((row) => {
      const sent = row.applicantId === user.id;
      return {
        kind: "MENTORSHIP",
        id: row.id,
        status: row.status,
        title: sent ? "Mentorship request sent" : "Mentorship request received",
        counterpart: sent ? row.mentor : row.applicant,
        updatedAt: row.updatedAt,
      };
    }),
    ...applications.map((row) => ({
      kind: "PROGRAM_APPLICATION",
      id: row.id,
      status: row.status,
      title: row.program.programName,
      counterpart: row.startupId === user.id ? row.program.owner : row.startup,
      updatedAt: row.updatedAt,
    })),
    ...registrations.map((row) => ({
      kind: "EVENT_REGISTRATION",
      id: row.id,
      status: row.registrationStatus,
      title: row.event.title,
      counterpart: row.event.organizer,
      updatedAt: row.createdAt,
    })),
  ];

  items.sort(
    (a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)
  );

  return { items: items.slice(0, limit) };
}

module.exports = {
  DashboardError,
  getSummary,
  getActivity,
};
