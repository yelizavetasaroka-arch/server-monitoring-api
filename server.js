require("dotenv").config();
const express = require("express");
const { ServerMetric } = require("./models");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. GET /metrics – получение списка всех метрик
app.get("/metrics", async (req, res, next) => {
  try {
    const metrics = await ServerMetric.findAll();
    res.status(200).json({
      success: true,
      count: metrics.length,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /metrics/:id – получение метрики по ID
app.get("/metrics/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const metric = await ServerMetric.findByPk(id);

    if (!metric) {
      return res.status(404).json({
        success: false,
        message: `Запись метрики с ID ${id} не найдена`,
      });
    }

    res.status(200).json({
      success: true,
      data: metric,
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /metrics – добавление новой метрики
app.post("/metrics", async (req, res, next) => {
  try {
    const { serverId, cpuUsagePercent, ramUsagePercent, diskUsagePercent } =
      req.body;

    if (
      !serverId ||
      cpuUsagePercent === undefined ||
      ramUsagePercent === undefined ||
      diskUsagePercent === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ошибка валидации: переданы не все обязательные поля (serverId, cpuUsagePercent, ramUsagePercent, diskUsagePercent)",
      });
    }

    const newMetric = await ServerMetric.create(req.body);

    res.status(201).json({
      success: true,
      data: newMetric,
    });
  } catch (error) {
    next(error);
  }
});

// 4. PUT /metrics/:id – обновление метрики
app.put("/metrics/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const { serverId, cpuUsagePercent, ramUsagePercent, diskUsagePercent } =
      req.body;

    if (
      !serverId ||
      cpuUsagePercent === undefined ||
      ramUsagePercent === undefined ||
      diskUsagePercent === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ошибка валидации: для полного обновления требуются все обязательные поля",
      });
    }

    const [updatedRows] = await ServerMetric.update(req.body, {
      where: { id },
    });

    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Запись метрики с ID ${id} не найдена`,
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
});

// 5. DELETE /metrics/:id – удаление метрики
app.delete("/metrics/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const metricToDelete = await ServerMetric.findByPk(id);

    if (!metricToDelete) {
      return res.status(404).json({
        success: false,
        message: `Запись метрики с ID ${id} не найдена`,
      });
    }

    await ServerMetric.destroy({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: `Запись метрики с ID ${id} успешно удалена`,
      data: metricToDelete,
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Запрашиваемый маршрут не найден",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Внутренняя ошибка сервера",
    error: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Сервер мониторинга нагрузки запущен на порту ${PORT}`);
});
