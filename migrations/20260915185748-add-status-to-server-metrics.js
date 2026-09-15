"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ServerMetrics", "status", {
      type: Sequelize.STRING,
      defaultValue: "active",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("ServerMetrics", "status");
  },
};
