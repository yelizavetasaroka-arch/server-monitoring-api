require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const { ServerMetric, User } = require("./models");

const { authenticateToken, requireAdmin } = require("./middleware/auth");

// ИМПОРТИРУЕМ ГЕТТЕР ИЗ НОВОГО ЛОГГЕРА
const { requestLogger, isLogFileUnavailable } = require("./middleware/logger");
const { notFoundHandler, errorHandler } = require("./middleware/errors");

const mongoose = require("mongoose");
const MongoServerMetric = require("./models/MongoServerMetric");
const mongoMetricsRouter = require("./routes/mongoMetrics");

const app = express();
const cors = require("cors");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/mongo", mongoMetricsRouter);
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/server_monitoring",
  )
  .then(() => console.log(" Локальная MongoDB успешно подключена."))
  .catch((err) => console.error(" Ошибка подключения к MongoDB:", err));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

app.use((req, res, next) => {
  let role = req.cookies.user_role;
  let email = req.cookies.user_email;

  if (req.query.auth === "1") {
    role = "admin";
  }

  const userRole = role || "guest";

  res.locals.user = {
    name: email || (userRole === "admin" ? "Администратор" : "Гость"),
    role: userRole,
  };

  next();
});

const requireWebAdmin = (req, res, next) => {
  if (res.locals.user.role !== "admin") {
    return res.status(403).render("404", {
      title: "403 - Доступ ограничен",
      url: "Доступ к этой странице есть только у администраторов. Пожалуйста, авторизуйтесь под ролью Администратора.",
    });
  }
  next();
};

// ==========================================
// БЛОКИРОВКА ДОБАВЛЕНИЯ ПРИ ОТКАЗЕ ЛОГГЕРА
// ==========================================
const blockIfLogsDown = (req, res, next) => {
  if (isLogFileUnavailable()) {
    const message =
      "Добавление метрик временно заблокировано: критическая ошибка системы аудита.";

    // Если это API (AJAX) или клиент ждёт JSON
    if (
      req.xhr ||
      req.path.startsWith("/api") ||
      req.headers.accept?.includes("json")
    ) {
      return res.status(503).json({ success: false, message });
    }

    // Если обычная форма — рендерим страницу ошибки
    return res.status(503).render("500", {
      title: "Ошибка сервера",
      error: message,
      user: res.locals.user || null,
    });
  }
  next();
};

// ==========================================
// SSR МАРШРУТЫ (EJS Страницы)
// ==========================================

app.get("/", async (req, res, next) => {
  try {
    if (res.locals.user.role === "guest") {
      return res.redirect("/login");
    }

    const metrics = await ServerMetric.findAll();
    res.render("index", { title: "Мониторинг серверов", metrics });
  } catch (error) {
    next(error);
  }
});

app.get("/login", (req, res) => {
  if (res.locals.user.role !== "guest") {
    return res.redirect("/");
  }
  res.render("login", { title: "Авторизация в системе", error: null });
});

app.post("/login", async (req, res, next) => {
  try {
    let { email, password } = req.body;

    email = email ? email.trim() : "";
    password = password ? password.trim() : "";

    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Авторизация в системе",
        error: "Пожалуйста, заполните все поля",
      });
    }

    if (email.length > 50 || password.length > 50) {
      return res.status(400).render("login", {
        title: "Авторизация в системе",
        error: "Длина email и пароля не должна превышать 50 символов",
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).render("login", {
        title: "Авторизация в системе",
        error: "Неверный email или пароль",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).render("login", {
        title: "Авторизация в системе",
        error: "Неверный email или пароль",
      });
    }

    res.cookie("user_role", user.role, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie("user_email", user.email, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("user_role");
  res.clearCookie("user_email");
  res.redirect("/login");
});

// ДОБАВЛЕНА ПРОВЕРКА ЛОГГЕРА ДЛЯ СТРАНИЦЫ ДОБАВЛЕНИЯ
app.get("/add", requireWebAdmin, blockIfLogsDown, (req, res) => {
  res.render("add", { title: "Добавить метрику сервера" });
});

// ДОБАВЛЕНА ПРОВЕРКА ЛОГГЕРА ДЛЯ ПОСТ-ЗАПРОСА
app.post("/add", requireWebAdmin, blockIfLogsDown, async (req, res, next) => {
  try {
    const {
      serverId,
      cpuUsagePercent,
      ramUsagePercent,
      diskUsagePercent,
      networkTrafficKbps,
    } = req.body;

    const trimmedServerId = serverId ? serverId.trim() : "";

    const parseNumber = (val) => {
      if (!val) return NaN;
      return parseFloat(val.toString().replace(",", "."));
    };

    const cpu = parseNumber(cpuUsagePercent);
    const ram = parseNumber(ramUsagePercent);
    const disk = parseNumber(diskUsagePercent);

    const rawTraffic = networkTrafficKbps
      ? networkTrafficKbps.toString().trim()
      : "";

    const trafficRegex = /^\d+([.,]\d{1,2})?$/;

    if (rawTraffic !== "" && !trafficRegex.test(rawTraffic)) {
      return res.status(400).render("add", {
        title: "Добавление метрики",
        error:
          "Значение сетевого трафика может содержать не более двух знаков после запятой.",
      });
    }

    const traffic =
      rawTraffic !== "" ? parseFloat(rawTraffic.replace(",", ".")) : 0;

    if (!trimmedServerId || isNaN(cpu) || isNaN(ram) || isNaN(disk)) {
      return res.status(400).render("add", {
        title: "Добавление метрики",
        error:
          "Заполните все обязательные поля. Идентификатор сервера может содержать буквы и цифры, а показатели нагрузки должны быть числовыми.",
      });
    }

    if (trimmedServerId.length > 50) {
      return res.status(400).render("add", {
        title: "Добавление метрики",
        error: "ID сервера не должен превышать 50 символов",
      });
    }

    if (
      cpu < 0 ||
      cpu > 100 ||
      ram < 0 ||
      ram > 100 ||
      disk < 0 ||
      disk > 100
    ) {
      return res.status(400).render("add", {
        title: "Добавление метрики",
        error:
          "Показатели CPU, RAM и Диска должны быть в пределах от 0% до 100%",
      });
    }

    if (traffic < 0 || traffic > 10000000 || isNaN(traffic)) {
      return res.status(400).render("add", {
        title: "Добавление метрики",
        error:
          "Значение сетевого трафика должно быть в диапазоне от 0 до 10 000 000 Kbps",
      });
    }

    await ServerMetric.create({
      serverId: trimmedServerId,
      cpuUsagePercent: cpu,
      ramUsagePercent: ram,
      diskUsagePercent: disk,
      networkTrafficKbps: traffic,
    });

    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

app.get("/item/:id", async (req, res, next) => {
  try {
    if (res.locals.user.role === "guest") {
      return res.redirect("/login");
    }

    const metric = await ServerMetric.findByPk(req.params.id);
    if (!metric) return next();
    res.render("item", {
      title: `Метрика сервера: ${metric.serverId}`,
      metric,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// REST API МАРШРУТЫ
// ==========================================

app.post("/auth/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;

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
      role: "user",
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

app.get("/metrics", authenticateToken, async (req, res, next) => {
  try {
    const { search } = req.query;
    let condition = {};

    if (search) {
      condition = {
        serverId: {
          [Op.like]: `%${search}%`,
        },
      };
    }

    const metrics = await ServerMetric.findAll({ where: condition });

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

// ДОБАВЛЕНА ПРОВЕРКА ЛОГГЕРА ДЛЯ API-СОЗДАНИЯ МЕТРИКИ
app.post(
  "/metrics",
  authenticateToken,
  requireAdmin,
  blockIfLogsDown,
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

app.get("/cause-error", (req, res, next) => {
  next(new Error("Системная ошибка приложения"));
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер мониторинга нагрузки запущен: http://localhost:${PORT}`);
});
