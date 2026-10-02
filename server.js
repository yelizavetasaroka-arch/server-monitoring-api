require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { ServerMetric, User } = require("./models");

// (JWT)
const { authenticateToken, requireAdmin } = require("./middleware/auth");

const requestLogger = require("./middleware/logger");
const { notFoundHandler, errorHandler } = require("./middleware/errors");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Подключение встроенных и глобальных middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// Сохранение состояния авторизации для EJS-шаблонов
app.use((req, res, next) => {
  let role = req.cookies.user_role;
  let email = req.cookies.user_email;

  // Резервный доступ через query-параметр ?auth=1
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
// SSR МАРШРУТЫ (EJS Страницы)
// ==========================================

// Главная страница — просмотр метрик (с перенаправлением незарегистрированных)
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Авторизация в системе",
        error: "Пожалуйста, заполните все поля",
      });
    }

    // Находим пользователя в БД
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).render("login", {
        title: "Авторизация в системе",
        error: "Неверный email или пароль",
      });
    }

    // Сверяем хэш пароля через bcrypt
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).render("login", {
        title: "Авторизация в системе",
        error: "Неверный email или пароль",
      });
    }

    // Записываем роль и email в cookies
    res.cookie("user_role", user.role, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 часа
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

app.get("/add", requireWebAdmin, (req, res) => {
  res.render("add", { title: "Добавить метрику сервера" });
});

app.post("/add", requireWebAdmin, async (req, res, next) => {
  try {
    const {
      serverId,
      cpuUsagePercent,
      ramUsagePercent,
      diskUsagePercent,
      networkTrafficKbps,
    } = req.body;

    await ServerMetric.create({
      serverId: serverId || "srv-node-01",
      cpuUsagePercent: parseFloat(cpuUsagePercent) || 0,
      ramUsagePercent: parseFloat(ramUsagePercent) || 0,
      diskUsagePercent: parseFloat(diskUsagePercent) || 0,
      networkTrafficKbps: parseInt(networkTrafficKbps, 10) || 0,
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
      //Шифрует payload с помощью jwt.sign, используя секретный ключ process.env.JWT_SECRET, и задает срок жизни токена на 1 час
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
  next(new Error("Тестовая системная ошибка приложения"));
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер мониторинга нагрузки запущен: http://localhost:${PORT}`);
});
