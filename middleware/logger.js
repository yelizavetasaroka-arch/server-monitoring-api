const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../requests.log");

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logMessage = `[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)\n`;

    console.log(logMessage.trim());

    fs.appendFile(logFilePath, logMessage, "utf8", (err) => {
      if (err) {
        console.error("Ошибка при записи лога в файл:", err);
      }
    });
  });

  next();
};

module.exports = requestLogger;
