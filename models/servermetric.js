'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ServerMetric extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ServerMetric.init({
    serverId: DataTypes.STRING,
    cpuUsagePercent: DataTypes.FLOAT,
    ramUsagePercent: DataTypes.FLOAT,
    diskUsagePercent: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'ServerMetric',
  });
  return ServerMetric;
};