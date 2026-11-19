const pool = require("../config/db");

// GET /metrics
exports.getAllMetrics = async (req, res, next) => {
  try {
    // Таблица называется "ServerMetrics", колонка "createdAt"
    const result = await pool.query(
      'SELECT * FROM "ServerMetrics" ORDER BY "createdAt" DESC',
    );
    res
      .status(200)
      .json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// GET /metrics/:id
exports.getMetricById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM "ServerMetrics" WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Метрика не найдена" });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// POST /metrics
exports.createMetric = async (req, res, next) => {
  try {
    const { serverId, cpuUsagePercent, ramUsagePercent } = req.body;
    if (!serverId || cpuUsagePercent === undefined) {
      return res.status(400).json({
        success: false,
        message: "Укажите serverId и cpuUsagePercent",
      });
    }

    const query = `
      INSERT INTO "ServerMetrics" ("serverId", "cpuUsagePercent", "ramUsagePercent", "createdAt", "updatedAt") 
      VALUES ($1, $2, $3, NOW(), NOW()) 
      RETURNING *;
    `;
    const result = await pool.query(query, [
      serverId,
      cpuUsagePercent,
      ramUsagePercent || 0,
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// PUT /metrics/:id
exports.updateMetric = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { serverId, cpuUsagePercent, ramUsagePercent } = req.body;

    const result = await pool.query(
      `UPDATE "ServerMetrics" 
       SET "serverId" = $1, "cpuUsagePercent" = $2, "ramUsagePercent" = $3, "updatedAt" = NOW() 
       WHERE id = $4 RETURNING *`,
      [serverId, cpuUsagePercent, ramUsagePercent, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Метрика не найдена" });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// DELETE /metrics/:id
exports.deleteMetric = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM "ServerMetrics" WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Метрика не найдена" });
    }
    res.status(200).json({
      success: true,
      message: "Метрика удалена",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
