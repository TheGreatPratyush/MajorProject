const express = require("express");

const {
  authenticateToken,
  optionalAuthenticateToken,
} = require("../../middleware/auth.middleware");

const {
  listResources,
  listMyResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} = require("./resources.controller");

const router = express.Router();

router.get("/", listResources);

router.get("/mine", authenticateToken, listMyResources);

router.post("/", authenticateToken, createResource);

router.patch("/:id", authenticateToken, updateResource);

router.delete("/:id", authenticateToken, deleteResource);

router.get("/:id", optionalAuthenticateToken, getResource);

module.exports = router;
