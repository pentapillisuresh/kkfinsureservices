const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Referral = sequelize.define('Referral', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    referrerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    referredUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    investmentAmount: {
      type: DataTypes.DECIMAL(15, 2)
    },
    rewardPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    rewardType: {
      type: DataTypes.ENUM('voucher', 'points', 'cashback'),
      allowNull: false
    },
    rewardValue: {
      type: DataTypes.STRING,
      comment: 'Value of voucher/points/cashback'
    },
    offerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Offers', key: 'id' }
    }
  });

  Referral.associate = (models) => {
    Referral.belongsTo(models.User, { foreignKey: 'referrerId', as: 'referrer' });
    Referral.belongsTo(models.User, { foreignKey: 'referredUserId', as: 'referredUser' });
    Referral.belongsTo(models.Offer, { foreignKey: 'offerId', as: 'offer' });
  };

  return Referral;
};