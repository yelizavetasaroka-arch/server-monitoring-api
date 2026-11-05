const express = require("express");
const router = express.Router();
const MongoServerMetric = require("../models/MongoServerMetric");

router.get("/metrics", async (req, res, next) => {
  try {
    const metrics = await MongoServerMetric.find();
    res
      .status(200)
      .json({ success: true, count: metrics.length, data: metrics });
  } catch (error) {
    next(error);
  }
});

router.get("/metrics/:id", async (req, res, next) => {
  try {
    const metric = await MongoServerMetric.findById(req.params.id);
    if (!metric)
      return res.status(404).json({ success: false, message: "Не найдено" });
    res.status(200).json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
});

router.post("/metrics", async (req, res, next) => {
  try {
    const newMetric = await MongoServerMetric.create(req.body);
    res.status(201).json({ success: true, data: newMetric });
  } catch (error) {
    next(error);
  }
});

router.put("/metrics/:id", async (req, res, next) => {
  try {
    const updatedMetric = await MongoServerMetric.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updatedMetric)
      return res.status(404).json({ success: false, message: "Не найдено" });
    res.status(200).json({ success: true, data: updatedMetric });
  } catch (error) {
    next(error);
  }
});

router.delete("/metrics/:id", async (req, res, next) => {
  try {
    const deletedMetric = await MongoServerMetric.findByIdAndDelete(
      req.params.id,
    );
    if (!deletedMetric)
      return res.status(404).json({ success: false, message: "Не найдено" });
    res
      .status(200)
      .json({ success: true, message: "Успешно удалено", data: deletedMetric });
  } catch (error) {
    next(error);
  }
});

router.post("/metrics/:id/logs", async (req, res, next) => {
  try {
    const { level, message } = req.body;
    const metric = await MongoServerMetric.findById(req.params.id);

    if (!metric)
      return res
        .status(404)
        .json({ success: false, message: "Метрика не найдена" });

    metric.logs.push({ level, message });
    await metric.save();

    res.status(201).json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
