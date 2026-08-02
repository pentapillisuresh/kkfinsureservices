const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerCommission = sequelize.define('PartnerCommission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    partnerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    month: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'First day of the month (e.g., 2026-07-01)'
    },
    totalInvestmentBase: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Sum of active investments linked to this partner'
    },
    commissionRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Rate applied for this month (from partner tier)'
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    paidOn: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when payout was processed (1st–10th of month)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid'),
      defaultValue: 'pending'
    }
  });

  PartnerCommission.associate = (models) => {
    PartnerCommission.belongsTo(models.User, { foreignKey: 'partnerId', as: 'partner' });
  };

  return PartnerCommission;
};