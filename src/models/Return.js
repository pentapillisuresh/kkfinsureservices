const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Return = sequelize.define('Return', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    investmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Investments', key: 'id' }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    offerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Offers', key: 'id' }
    },
    month: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Month for which return is generated'
    },
    monthNo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'generated return month number'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    ROI: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('monthly', 'annual_bonus', 'quarterly_senior','offer'),
      defaultValue: 'monthly'
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'inactive'),
      defaultValue: 'pending'
    },
    paidOn: {
      type: DataTypes.DATE,
      comment: 'Date when payout was processed (1st–10th of month)'
    },
    description: {
      type: DataTypes.STRING,
      comment: 'Reason for return amount'
    }
  });

  Return.associate = (models) => {
    Return.belongsTo(models.Investment, { foreignKey: 'investmentId', as: 'investment' });
    Return.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Return;
};