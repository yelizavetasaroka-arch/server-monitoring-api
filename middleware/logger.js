const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../requests.log");
let logFileUnavailable = false; // Флаг аварийного режима

// Создание файла при старте
if (!fs.existsSync(logFilePath)) {
  try {
    fs.writeFileSync(logFilePath, "", "utf8");
    console.log("Файл логов создан при запуске сервера.");
  } catch (err) {
    console.error(
      "[LOGGER ERROR] Не удалось создать файл системного журнала при запуске.",
    );
    logFileUnavailable = true;
  }
}

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logMessage = `[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)\n`;

    console.log(logMessage.trim());

    // Раннего return больше нет — пытаемся писать каждый раз,
    // чтобы обнаружить восстановление файла.

    fs.stat(logFilePath, (err, stats) => {
      if (err) {
        console.error(
          "[LOGGER ERROR] Невозможно получить доступ к системному журналу. Проверьте наличие файла и права доступа.",
        );
        logFileUnavailable = true;
        return;
      }

      if (!stats.isFile()) {
        console.error(
          "[LOGGER ERROR] Некорректный формат системного журнала. Запись невозможна.",
        );
        logFileUnavailable = true;
        return;
      }

      fs.appendFile(logFilePath, logMessage, "utf8", (appendErr) => {
        if (appendErr) {
          console.error("[LOGGER ERROR] Сбой при записи в системный журнал.");
          logFileUnavailable = true;
        } else {
          // Восстановление: если запись прошла — снимаем блокировку
          if (logFileUnavailable) {
            console.log(
              "[LOGGER INFO] Системный журнал восстановлен. Блокировка снята.",
            );
            logFileUnavailable = false;
          }
        }
      });
    });
  });

  next();
};

module.exports = {
  requestLogger,
  isLogFileUnavailable: () => logFileUnavailable,
};
