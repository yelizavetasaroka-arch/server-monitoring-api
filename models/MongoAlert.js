const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  serverId: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Alert", alertSchema);
