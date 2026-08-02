const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerTier = sequelize.define('PartnerTier', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.ENUM('referral', 'authorised', 'hni'),
      allowNull: false,
      unique: true
    },
    minInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    maxInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    commissionRate: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  // No direct association needed, but you can add if you link to User.
  // If you want to link to User via partnerTierId, add a column in User.
  // We'll keep it separate.

  return PartnerTier;
};