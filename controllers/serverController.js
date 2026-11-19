const pool = require("../config/db");

// GET /servers
exports.getAllServers = async (req, res, next) => {
  try {
    // Скорее всего, Sequelize создал таблицу "Servers"
    const result = await pool.query('SELECT * FROM "Servers" ORDER BY id ASC');
    res
      .status(200)
      .json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// GET /servers/:id
exports.getServerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM "Servers" WHERE id = $1', [
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

// POST /servers
exports.createServer = async (req, res, next) => {
  try {
    const { name, ipAddress, status, os } = req.body;
    if (!name || !ipAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Поля name и ipAddress обязательны" });
    }

    const query = `
      INSERT INTO "Servers" ("name", "ipAddress", "status", "os", "createdAt", "updatedAt") 
      VALUES ($1, $2, $3, $4, NOW(), NOW()) 
      RETURNING *;
    `;
    const values = [name, ipAddress, status || "active", os || "Unknown"];
    const result = await pool.query(query, values);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// PUT /servers/:id
exports.updateServer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ipAddress, status, os } = req.body;

    if (!name || !ipAddress || !status || !os) {
      return res.status(400).json({
        success: false,
        message: "Для PUT-запроса необходимы все поля",
      });
    }

    const query = `
      UPDATE "Servers" 
      SET "name" = $1, "ipAddress" = $2, "status" = $3, "os" = $4, "updatedAt" = NOW() 
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

// PATCH /servers/:id
exports.patchServer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Передайте хотя бы одно поле для обновления",
      });
    }

    const fields = [];
    const values = [];
    let counter = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (["name", "ipAddress", "status", "os"].includes(key)) {
        fields.push(`"${key}" = $${counter}`);
        values.push(value);
        counter++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Нет разрешенных полей для обновления",
      });
    }

    values.push(id);
    const query = `
      UPDATE "Servers" 
      SET ${fields.join(", ")}, "updatedAt" = NOW() 
      WHERE id = $${counter} 
      RETURNING *;
    `;

    const result = await pool.query(query, values);

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

// DELETE /servers/:id
exports.deleteServer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM "Servers" WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Сервер не найден" });
    }

    res.status(200).json({
      success: true,
      message: "Успешно удалено",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
