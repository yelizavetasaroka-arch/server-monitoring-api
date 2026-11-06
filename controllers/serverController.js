const pool = require("../config/db");

exports.getAllServers = async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM servers ORDER BY id ASC");
    res
      .status(200)
      .json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getServerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM servers WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Сервер не найден" });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.createServer = async (req, res, next) => {
  try {
    const { name, ipAddress, status, os } = req.body;
    if (!name || !ipAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Поля name и ipAddress обязательны" });
    }

    const query = `
      INSERT INTO servers (name, ipAddress, status, os) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *;
    `;
    const values = [name, ipAddress, status || "active", os || "Unknown"];
    const result = await pool.query(query, values);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateServer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ipAddress, status, os } = req.body;

    if (!name || !ipAddress || !status || !os) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Для PUT-запроса необходимы все поля",
        });
    }

    const query = `
      UPDATE servers 
      SET name = $1, ipAddress = $2, status = $3, os = $4 
      WHERE id = $5 
      RETURNING *;
    `;
    const result = await pool.query(query, [name, ipAddress, status, os, id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Сервер не найден" });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteServer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM servers WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Сервер не найден" });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Успешно удалено",
        data: result.rows[0],
      });
  } catch (error) {
    next(error);
  }
};
