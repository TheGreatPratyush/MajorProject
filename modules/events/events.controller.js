const v = require("./events.validation");
const s = require("./events.service");

function validationError(res, error) {
  return res.status(400).json({ success: false, message: "Validation failed.", errors: error.issues.map((x) => ({ field: x.path.join("."), message: x.message })) });
}
function handleError(res, error) {
  if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message, errors: error.errors || [] });
  if (error.code === "P2002") return res.status(409).json({ success: false, message: "A registration already exists.", errors: [] });
  console.error("Events module error:", error);
  return res.status(500).json({ success: false, message: "An unexpected server error occurred.", errors: [] });
}
const run = (fn, status = 200, message = "Request completed successfully.") => async (req, res) => {
  try {
    const result = await fn(req);
    if (result === null || res.headersSent) return;
    return res.status(status).json({ success: true, message, data: result?.items ? { items: result.items } : result, meta: result?.meta || null });
  } catch (e) { return handleError(res, e); }
};
const parse = (schema, value, res) => {
  const r = schema.safeParse(value);
  if (!r.success) { validationError(res, r.error); return null; }
  return r.data;
};
const listEvents = run((req) => {
  const q = parse(v.eventListQuerySchema, req.query, req.res);
  return q && s.listEvents(q);
}, 200, "Events retrieved successfully.");
const listMyEvents = run((req) => {
  const q = parse(v.eventListQuerySchema, req.query, req.res);
  return q && s.listMyEvents(req.user, q);
}, 200, "Your events retrieved successfully.");
const getEvent = run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  return id && s.getEvent(req.user, id);
}, 200, "Event retrieved successfully.");
const createEvent = run((req) => {
  const d = parse(v.createEventSchema, req.body, req.res);
  return d && s.createEvent(req.user, d);
}, 201, "Event created as draft.");
const updateEvent = run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  const d = parse(v.updateEventSchema, req.body, req.res);
  return id && d && s.updateEvent(req.user, id, d);
}, 200, "Event updated successfully.");
const action = (method, message) => run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  return id && s[method](req.user, id);
}, 200, message);
const publishEvent = action("publishEvent", "Event published successfully.");
const cancelEvent = action("cancelEvent", "Event cancelled successfully.");
const completeEvent = action("completeEvent", "Event completed successfully.");
const deleteEvent = action("deleteEvent", "Event deleted successfully.");
const register = action("register", "Event registration successful.");
const cancelRegistration = action("cancelRegistration", "Event registration cancelled.");
const myRegistrations = run((req) => {
  const q = parse(v.registrationListQuerySchema, req.query, req.res);
  return q && s.myRegistrations(req.user, q);
}, 200, "Your registrations retrieved successfully.");
const eventRegistrations = run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  const q = parse(v.registrationListQuerySchema, req.query, req.res);
  return id && q && s.eventRegistrations(req.user, id, q);
}, 200, "Event registrations retrieved successfully.");
module.exports = { listEvents, listMyEvents, getEvent, createEvent, updateEvent, publishEvent, cancelEvent, completeEvent, deleteEvent, register, cancelRegistration, myRegistrations, eventRegistrations };
