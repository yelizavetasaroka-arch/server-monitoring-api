const { ServerMetric } = require("../models");
const { Op } = require("sequelize");

// 1. Получение всех метрик (с поиском)
exports.getAllMetrics = async (req, res, next) => {
  try {
    const { search } = req.query;
    let condition = {};

    if (search) {
      condition = {
        serverId: { [Op.like]: `%${search}%` },
      };
    }

    const metrics = await ServerMetric.findAll({
      where: condition,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: metrics.length,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Создание метрики (с проверкой на WebSocket-алерт)
exports.createMetric = async (req, res, next) => {
  try {
    const {
      serverId,
      cpuUsagePercent,
      ramUsagePercent,
      diskUsagePercent,
      networkTrafficKbps,
    } = req.body;

    if (!serverId || cpuUsagePercent === undefined) {
      return res.status(400).json({
        success: false,
        message: "Укажите serverId и cpuUsagePercent",
      });
    }

    const newMetric = await ServerMetric.create({
      serverId,
      cpuUsagePercent,
      ramUsagePercent: ramUsagePercent || 0,
      diskUsagePercent: diskUsagePercent || 0,
      networkTrafficKbps: networkTrafficKbps || 0,
    });

    // === ПРОВЕРКА НА КРИТИЧЕСКУЮ НАГРУЗКУ (CPU > 90%) ===
    if (parseFloat(cpuUsagePercent) > 90) {
      const io = req.app.get("io"); // Достаем io, который сохранен в server.js
      const MongoAlert = require("../models/MongoAlert");

      const alertData = {
        serverId: serverId,
        message: `Критическая нагрузка CPU: ${cpuUsagePercent}%`,
        timestamp: new Date().toLocaleTimeString(),
      };

      // 1. Сохраняем алерт в MongoDB
      try {
        await new MongoAlert(alertData).save();
      } catch (err) {
        console.error("Ошибка сохранения алерта в MongoDB:", err);
      }

      // 2. Отправляем событие всем подключенным клиентам через WebSocket
      if (io) {
        io.emit("broadcast-alert", alertData);
      }
    }
    // =======================================================

    res.status(201).json({
      success: true,
      data: newMetric,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Обновление метрики (для кнопки "Изменить")
exports.updateMetric = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      serverId,
      cpuUsagePercent,
      ramUsagePercent,
      diskUsagePercent,
      networkTrafficKbps,
    } = req.body;

    const [updatedRows] = await ServerMetric.update(
      {
        serverId,
        cpuUsagePercent,
        ramUsagePercent,
        diskUsagePercent,
        networkTrafficKbps,
      },
      { where: { id } },
    );

    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Запись не найдена",
      });
    }

    const updatedMetric = await ServerMetric.findByPk(id);
    res.status(200).json({
      success: true,
      data: updatedMetric,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Удаление метрики (для кнопки "Удалить")
exports.deleteMetric = async (req, res, next) => {
  try {
    const { id } = req.params;

    const metricToDelete = await ServerMetric.findByPk(id);
    if (!metricToDelete) {
      return res.status(404).json({
        success: false,
        message: "Запись не найдена",
      });
    }

    await ServerMetric.destroy({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Запись успешно удалена",
      data: metricToDelete,
    });
  } catch (error) {
    next(error);
  }
};
