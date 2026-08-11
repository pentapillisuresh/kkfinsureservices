const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BalanceSheet = sequelize.define('BalanceSheet', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    balanceSheetFile: {
      type: DataTypes.STRING,
      allowNull: true
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    totalInvestments: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    totalReturns: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    totalCommission: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    netWorth: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    generatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  BalanceSheet.associate = (models) => {
    BalanceSheet.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return BalanceSheet;
};