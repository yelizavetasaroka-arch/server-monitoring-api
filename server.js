require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ServerMetric, User } = require("./models");
const { authenticateToken, requireAdmin } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/auth/register", async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email и пароль обязательны для заполнения",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Пользователь с таким email уже существует",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      passwordHash,
      role: role && ["user", "admin"].includes(role) ? role : "user",
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Укажите email и пароль",
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "default_secret",
      {
        expiresIn: "1h",
      },
    );

    res.status(200).json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    next(error);
  }
});

// Профиль текущего пользователя (GET /auth/profile) — защищён JWT
app.get("/auth/profile", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["passwordHash"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// GET /metrics — Доступно любым авторизованным пользователям
app.get("/metrics", authenticateToken, async (req, res, next) => {
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

app.get("/metrics/:id", authenticateToken, async (req, res, next) => {
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

app.post(
  "/metrics",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
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
  },
);

// PUT /metrics/:id — Доступно ТОЛЬКО администраторам
app.put(
  "/metrics/:id",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
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
  },
);

app.delete(
  "/metrics/:id",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
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
  },
);

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
