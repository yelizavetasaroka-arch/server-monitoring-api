const express = require("express");
const router = express.Router();
const incidentController = require("../controllers/incidentController");

router.get("/", incidentController.getAllIncidents);
router.get("/:id", incidentController.getIncidentById); // NEW
router.post("/", incidentController.createIncident);
router.put("/:id", incidentController.updateIncident); // NEW
router.patch("/:id", incidentController.updateIncident); // NEW
router.delete("/:id", incidentController.deleteIncident);

module.exports = router;
