const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Offer = sequelize.define('Offer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rewardType: {
      type: DataTypes.ENUM('gift', 'reward points', 'cashback'),
      allowNull: false
    },
    rewardValue: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g., "500" for ₹500 cashback, "100" for 100 points, or "Amazon voucher"'
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Store dynamic conditions like {"minInvestment": 50000, "expiryDate": "2026-12-31"}'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  Offer.associate = (models) => {
    Offer.hasMany(models.Referral, { foreignKey: 'offerId', as: 'referrals' });
  };

  return Offer;
};