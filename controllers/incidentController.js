const pool = require("../config/db");

// GET /incidents
exports.getAllIncidents = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "Incidents" ORDER BY id DESC',
    );
    res
      .status(200)
      .json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// GET /incidents/:id
exports.getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM "Incidents" WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Инцидент не найден" });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// POST /incidents
exports.createIncident = async (req, res, next) => {
  try {
    const { serverId, severity, message } = req.body;
    if (!serverId || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Укажите serverId и message" });
    }

    const query = `
      INSERT INTO "Incidents" ("serverId", "severity", "message", "resolved", "createdAt", "updatedAt") 
      VALUES ($1, $2, $3, $4, NOW(), NOW()) 
      RETURNING *;
    `;
    const result = await pool.query(query, [
      serverId,
      severity || "MEDIUM",
      message,
      false,
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// PUT /incidents/:id
exports.updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { serverId, severity, message, resolved } = req.body;

    const result = await pool.query(
      `UPDATE "Incidents" 
       SET "serverId" = $1, "severity" = $2, "message" = $3, "resolved" = $4, "updatedAt" = NOW() 
       WHERE id = $5 RETURNING *`,
      [serverId, severity, message, resolved, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Инцидент не найден" });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// DELETE /incidents/:id
exports.deleteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM "Incidents" WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Инцидент не найден" });
    }

    res.status(200).json({
      success: true,
      message: "Инцидент удален",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
