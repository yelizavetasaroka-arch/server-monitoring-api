const pool = require("../config/db");

exports.getAllIncidents = async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM incidents ORDER BY id DESC");
    res
      .status(200)
      .json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.createIncident = async (req, res, next) => {
  try {
    const { serverId, severity, message } = req.body;
    if (!serverId || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Укажите serverId и message" });
    }

    const query = `
      INSERT INTO incidents (serverId, severity, message, resolved) 
      VALUES ($1, $2, $3, $4) 
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

exports.deleteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM incidents WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Инцидент не найден" });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Инцидент удален",
        data: result.rows[0],
      });
  } catch (error) {
    next(error);
  }
};
