const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Временное хранилище метрик нагрузки серверов в памяти
let metrics = [
  {
    id: 1,
    serverId: "srv-node-01",
    cpuUsagePercent: 45.2,
    ramUsagePercent: 68.5,
    diskUsagePercent: 82.1,
    networkTrafficKbps: 1250,
    timestamp: "2026-09-01T10:00:00Z",
  },
  {
    id: 2,
    serverId: "srv-node-02",
    cpuUsagePercent: 12.0,
    ramUsagePercent: 34.1,
    diskUsagePercent: 45.0,
    networkTrafficKbps: 450,
    timestamp: "2026-09-01T10:05:00Z",
  },
];

let nextId = 3;

// --- РЕАЛИЗАЦИЯ МАРШРУТОВ (REST API) ---

// 1. GET /metrics – получение списка всех метрик
app.get("/metrics", (req, res) => {
  res.status(200).json({
    success: true,
    count: metrics.length,
    data: metrics,
  });
});

// 2. GET /metrics/:id – получение метрики по ID
app.get("/metrics/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const metric = metrics.find((m) => m.id === id);

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
});

// 3. POST /metrics – добавление новой метрики нагрузки
app.post("/metrics", (req, res) => {
  const {
    serverId,
    cpuUsagePercent,
    ramUsagePercent,
    diskUsagePercent,
    networkTrafficKbps,
  } = req.body;

  // Проверка корректности (валидация) входных данных
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

  const newMetric = {
    id: nextId++,
    serverId,
    cpuUsagePercent: Number(cpuUsagePercent),
    ramUsagePercent: Number(ramUsagePercent),
    diskUsagePercent: Number(diskUsagePercent),
    networkTrafficKbps: networkTrafficKbps ? Number(networkTrafficKbps) : 0,
    timestamp: new Date().toISOString(),
  };

  metrics.push(newMetric);

  res.status(201).json({
    success: true,
    data: newMetric,
  });
});

// 4. PUT /metrics/:id – полное обновление метрики
app.put("/metrics/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = metrics.findIndex((m) => m.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Запись метрики с ID ${id} не найдена`,
    });
  }

  const {
    serverId,
    cpuUsagePercent,
    ramUsagePercent,
    diskUsagePercent,
    networkTrafficKbps,
  } = req.body;

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

  metrics[index] = {
    id,
    serverId,
    cpuUsagePercent: Number(cpuUsagePercent),
    ramUsagePercent: Number(ramUsagePercent),
    diskUsagePercent: Number(diskUsagePercent),
    networkTrafficKbps: Number(networkTrafficKbps || 0),
    timestamp: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    data: metrics[index],
  });
});

// 5. DELETE /metrics/:id – удаление метрики
app.delete("/metrics/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = metrics.findIndex((m) => m.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Запись метрики с ID ${id} не найдена`,
    });
  }

  const deletedMetric = metrics.splice(index, 1)[0];

  res.status(200).json({
    success: true,
    message: `Запись метрики с ID ${id} успешно удалена`,
    data: deletedMetric,
  });
});

// --- ОБРАБОТКА ОШИБОК ---

// Глобальный обработчик несуществующих маршрутов (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Запрашиваемый маршрут не найден",
  });
});

// Глобальный Middleware обработки системных ошибок (500)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Внутренняя ошибка сервера",
    error: err.message,
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер мониторинга нагрузки запущен на порту ${PORT}`);
});
