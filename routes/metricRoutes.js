const express = require("express");
const router = express.Router();
const metricController = require("../controllers/metricController");

router.get("/", metricController.getAllMetrics);
router.post("/", metricController.createMetric);

router.put("/:id", metricController.updateMetric);
router.delete("/:id", metricController.deleteMetric);

module.exports = router;
