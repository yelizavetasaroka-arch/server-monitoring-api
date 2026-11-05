const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  level: { type: String, enum: ["INFO", "WARNING", "ERROR"], default: "INFO" },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const mongoServerMetricSchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true },
  cpuUsagePercent: { type: Number, required: true, min: 0, max: 100 },
  ramUsagePercent: { type: Number, required: true, min: 0, max: 100 },
  diskUsagePercent: { type: Number, required: true, min: 0, max: 100 },
  networkTrafficKbps: { type: Number, default: 0 },

  logs: [logSchema],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MongoServerMetric", mongoServerMetricSchema);
