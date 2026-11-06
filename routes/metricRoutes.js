const express = require("express");
const router = express.Router();
const metricController = require("../controllers/metricController");

router.get("/", metricController.getAllMetrics);
router.post("/", metricController.createMetric);

module.exports = router;
