# Документация REST API — Мониторинг серверов

## 1. Ресурс: Серверы (`/api/servers`)
- **GET /api/servers** — Получение списка всех серверов.
- **GET /api/servers/:id** — Получение информации о конкретном сервере по ID.
- **POST /api/servers** — Создание нового сервера.
  - *Body example:* `{"name": "srv-prod-01", "ipAddress": "192.168.1.10", "status": "active", "os": "Ubuntu 22.04"}`
- **PUT /api/servers/:id** — Полное обновление данных сервера.
- **DELETE /api/servers/:id** — Удаление сервера.

## 2. Ресурс: Метрики (`/api/metrics`)
- **GET /api/metrics** — Получение всех метрик.
- **POST /api/metrics** — Добавление новой метрики.

## 3. Ресурс: Инциденты (`/api/incidents`)
- **GET /api/incidents** — Список инцидентов.
- **POST /api/incidents** — Регистрация инцидента.
- **DELETE /api/incidents/:id** — Удаление (закрытие) инцидента.




# Документация REST API — Система мониторинга серверов

Документация описывает эндпоинты для управления тремя основными ресурсами системы: **Серверы (`servers`)**, **Метрики (`metrics`)** и **Инциденты (`incidents`)**.

---

## 1. Ресурс: Серверы (`/api/servers`)

### Получение списка всех серверов
* **URL:** `/api/servers`
* **Метод:** `GET`
* **Описание:** Возвращает массив всех зарегистрированных в системе серверов.
* **Пример ответа (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": "1",
        "name": "srv-prod-01",
        "ipAddress": "192.168.1.10",
        "status": "active",
        "os": "Ubuntu 22.04"
      }
    ]
  }
Получение сервера по ID
URL: /api/servers/:id

Метод: GET

Параметры пути: id (строка/число) — уникальный идентификатор сервера.

Пример ответа (200 OK):

JSON
{
  "success": true,
  "data": {
    "id": "1",
    "name": "srv-prod-01",
    "ipAddress": "192.168.1.10",
    "status": "active",
    "os": "Ubuntu 22.04"
  }
}
Возможные ошибки:

404 Not Found — Сервер с указанным ID не найден.

Создание нового сервера
URL: /api/servers

Метод: POST

Тело запроса (JSON):

JSON
{
  "name": "srv-test-03",
  "ipAddress": "192.168.1.30",
  "status": "active",
  "os": "Debian 12"
}
Пример ответа (201 Created):

JSON
{
  "success": true,
  "data": {
    "id": "3",
    "name": "srv-test-03",
    "ipAddress": "192.168.1.30",
    "status": "active",
    "os": "Debian 12"
  }
}
Возможные ошибки:

400 Bad Request — Поля name или ipAddress обязательны для заполнения.

Полное обновление сервера
URL: /api/servers/:id

Метод: PUT

Тело запроса (JSON):

JSON
{
  "name": "srv-prod-updated",
  "ipAddress": "192.168.1.15",
  "status": "maintenance",
  "os": "Ubuntu 24.04"
}
Пример ответа (200 OK):

JSON
{
  "success": true,
  "data": {
    "id": "1",
    "name": "srv-prod-updated",
    "ipAddress": "192.168.1.15",
    "status": "maintenance",
    "os": "Ubuntu 24.04"
  }
}
Возможные ошибки:

400 Bad Request — Для PUT-запроса необходимы все поля.

404 Not Found — Сервер не найден.

Удаление сервера
URL: /api/servers/:id

Метод: DELETE

Пример ответа (200 OK):

JSON
{
  "success": true,
  "message": "Успешно удалено",
  "data": {
    "id": "1",
    "name": "srv-prod-01"
  }
}
Возможные ошибки:

404 Not Found — Сервер не найден.

2. Ресурс: Метрики (/api/metrics)
Получение списка всех метрик
URL: /api/metrics

Метод: GET

Пример ответа (200 OK):

JSON
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "1",
      "serverId": "1",
      "cpuUsagePercent": 45.5,
      "ramUsagePercent": 62.0,
      "timestamp": "2026-03-30T10:00:00.000Z"
    }
  ]
}
Добавление новой метрики
URL: /api/metrics

Метод: POST

Тело запроса (JSON):

JSON
{
  "serverId": "1",
  "cpuUsagePercent": 78.2,
  "ramUsagePercent": 85.0
}
Пример ответа (201 Created):

JSON
{
  "success": true,
  "data": {
    "id": "2",
    "serverId": "1",
    "cpuUsagePercent": 78.2,
    "ramUsagePercent": 85.0,
    "timestamp": "2026-03-30T12:00:00.000Z"
  }
}
Возможные ошибки:

400 Bad Request — Обязательные поля serverId или cpuUsagePercent отсутствуют.

3. Ресурс: Инциденты (/api/incidents)
Получение списка всех инцидентов
URL: /api/incidents

Метод: GET

Пример ответа (200 OK):

JSON
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "1",
      "serverId": "2",
      "severity": "HIGH",
      "message": "Превышен порог температуры CPU",
      "resolved": false
    }
  ]
}
Создание нового инцидента
URL: /api/incidents

Метод: POST

Тело запроса (JSON):

JSON
{
  "serverId": "1",
  "severity": "CRITICAL",
  "message": "Сбой дискового массива RAID"
}
Пример ответа (201 Created):

JSON
{
  "success": true,
  "data": {
    "id": "2",
    "serverId": "1",
    "severity": "CRITICAL",
    "message": "Сбой дискового массива RAID",
    "resolved": false
  }
}
Возможные ошибки:

400 Bad Request — Не указан serverId или текст сообщения (message).

Удаление (закрытие) инцидента
URL: /api/incidents/:id

Метод: DELETE

Пример ответа (200 OK):

JSON
{
  "success": true,
  "message": "Инцидент удален",
  "data": {
    "id": "1",
    "message": "Превышен порог температуры CPU"
  }
}
Возможные ошибки:

404 Not Found — Инцидент с указанным ID не найден.