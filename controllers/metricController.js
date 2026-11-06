const pool = require("../config/db");

exports.getAllMetrics = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM metrics ORDER BY timestamp DESC",
    );
    res
      .status(200)
      .json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.createMetric = async (req, res, next) => {
  try {
    const { serverId, cpuUsagePercent, ramUsagePercent } = req.body;
    if (!serverId || cpuUsagePercent === undefined) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Укажите serverId и cpuUsagePercent",
        });
    }

    const query = `
      INSERT INTO metrics (serverId, cpuUsagePercent, ramUsagePercent) 
      VALUES ($1, $2, $3) 
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
