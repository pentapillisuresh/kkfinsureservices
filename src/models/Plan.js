const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    planType: {
      type: DataTypes.ENUM('falcon', 'ALP',"PSM"),
      defaultValue: 'falcon'
    },

    minInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: { min: 100000 }
    },
    maxInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: { min: 100000 }
    },
    maturityPeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'in months'
    },
    monthlyReturnPercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 2, max: 4 }
    },
    annualBonusPercent: {
      type: DataTypes.FLOAT,
      defaultValue: 2
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  Plan.associate = (models) => {
    Plan.hasMany(models.Investment, {
      foreignKey: 'planId',
      as: 'investments'
  });  };

  return Plan;
};