const express = require("express");

const {
  listStartups,
  getStartup,
  listInvestors,
  getInvestor,
  listMentors,
  getMentor,
  listIncubators,
  getIncubator,
  listAccelerators,
  getAccelerator,
} = require("./directories.controller");

const router = express.Router();

// Startup directory
router.get("/startups", listStartups);
router.get("/startups/:id", getStartup);

// Investor directory
router.get("/investors", listInvestors);
router.get("/investors/:id", getInvestor);

// Mentor directory
router.get("/mentors", listMentors);
router.get("/mentors/:id", getMentor);

// Incubator directory
router.get("/incubators", listIncubators);
router.get("/incubators/:id", getIncubator);

// Accelerator directory
router.get("/accelerators", listAccelerators);
router.get("/accelerators/:id", getAccelerator);

module.exports = router;