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

// Builds { VALUE: count } with every enum value present (0 by default).
function toByStatus(groups, field, enumObject) {
  const result = Object.fromEntries(
    Object.values(enumObject).map((value) => [value, 0])
  );

  for (const group of groups) {
    result[group[field]] = group._count._all;
  }

  return result;
}

// A metric is a query plus how to turn its result into the response value.
function count(model, where) {
  return { query: prisma[model].count({ where }), format: (value) => value };
}

function byStatus(model, field, where, enumObject) {
  return {
    query: prisma[model].groupBy({ by: [field], where, _count: { _all: true } }),
    format: (groups) => toByStatus(groups, field, enumObject),
  };
}

function profileMetric(user) {
  const config = PROFILE_MODELS[user.role];

  if (!config) {
    return null;
  }

  return {
    query: prisma[config.model].findUnique({
      where: { userId: user.id },
      select: config.hasVerification
        ? { id: true, verificationStatus: true }
        : { id: true },
    }),
    format: (profile) => ({
      exists: Boolean(profile),
      verificationStatus: profile?.verificationStatus ?? null,
    }),
  };
}

function commonMetrics(user) {
  return {
    "notifications.unread": count("notification", { userId: user.id, isRead: false }),
    "connections.pendingReceived": count("connectionRequest", {
      receiverId: user.id,
      status: ConnectionStatus.PENDING,
    }),
    "connections.pendingSent": count("connectionRequest", {
      senderId: user.id,
      status: ConnectionStatus.PENDING,
    }),
    "connections.accepted": count("connectionRequest", {
      status: ConnectionStatus.ACCEPTED,
      OR: [{ senderId: user.id }, { receiverId: user.id }],
    }),
    // Active = still registered for a published event that has not ended.
    "events.activeRegistrations": count("eventRegistration", {
      userId: user.id,
      registrationStatus: "REGISTERED",
      event: { status: EventStatus.PUBLISHED, endDate: { gte: new Date() } },
    }),
    "community.posts": count("communityPost", { userId: user.id, status: "ACTIVE" }),
  };
}

function roleMetrics(user) {
  switch (user.role) {
    case "STARTUP":
      return {
        "programApplications.byStatus": byStatus(
          "programApplication", "status", { startupId: user.id }, ProgramApplicationStatus
        ),
        "mentorship.sent.byStatus": byStatus(
          "mentorshipApplication", "status", { applicantId: user.id }, MentorshipStatus
        ),
      };

    case "MENTOR":
      return {
        "mentorship.received.byStatus": byStatus(
          "mentorshipApplication", "status", { mentorId: user.id }, MentorshipStatus
        ),
      };

    case "INCUBATOR":
    case "ACCELERATOR":
      return {
        "programs.byStatus": byStatus(
          "incubationProgram", "status", { ownerId: user.id }, ProgramStatus
        ),
        "programApplications.received.byStatus": byStatus(
          "programApplication", "status", { program: { ownerId: user.id } }, ProgramApplicationStatus
        ),
        "organizedEvents.byStatus": byStatus(
          "event", "status", { organizerId: user.id }, EventStatus
        ),
      };

    case "GOVERNMENT":
      return {
        "resources.published": count("resource", { publisherId: user.id }),
        "organizedEvents.byStatus": byStatus(
          "event", "status", { organizerId: user.id }, EventStatus
        ),
      };

    default:
      // INVESTOR and PUBLIC only have the common block.
      return {};
  }
}

// Writes value into target at a dotted path, e.g. "connections.accepted".
function setPath(target, path, value) {
  const keys = path.split(".");
  let node = target;

  for (const key of keys.slice(0, -1)) {
    node[key] = node[key] || {};
    node = node[key];
  }

  node[keys[keys.length - 1]] = value;
}

async function getSummary(user) {
  assertDashboardRole(user);

  const profile = profileMetric(user);
  const metrics = Object.entries({ ...commonMetrics(user), ...roleMetrics(user) });
  const entries = profile ? [["profile", profile], ...metrics] : metrics;

  // One batch on a single connection (and one consistent transaction),
  // instead of up to ten parallel queries holding the connection pool.
  const results = await prisma.$transaction(entries.map(([, metric]) => metric.query));

  const summary = {
    role: user.role,
    profile: { exists: false, verificationStatus: null },
    metrics: {},
  };

  entries.forEach(([path, metric], index) => {
    const value = metric.format(results[index]);

    if (path === "profile") {
      summary.profile = value;
    } else {
      setPath(summary.metrics, path, value);
    }
  });

  return summary;
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
