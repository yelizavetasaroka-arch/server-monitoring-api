"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "ServerMetrics",
      [
        {
          serverId: "srv-node-01",
          cpuUsagePercent: 45.2,
          ramUsagePercent: 68.5,
          diskUsagePercent: 82.1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          serverId: "srv-node-02",
          cpuUsagePercent: 12.0,
          ramUsagePercent: 34.1,
          diskUsagePercent: 45.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ServerMetrics", null, {});
  },
};
