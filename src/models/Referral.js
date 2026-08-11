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
    rewardValue: {
      type: DataTypes.STRING,
      comment: 'Value of voucher/points/cashback'
    },
    offerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Offers', key: 'id' }
    },
    isOfferActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    expireDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'pending'),
      defaultValue: 'pending'
    },

  },
  Referral.addHook('afterCreate', async (referral, options) => {
    // 1. Add points for referrer
    const UserPoint = sequelize.models.UserPoint;
    const User = sequelize.model.User;
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year expiry
    await UserPoint.create({
      userId: referral.referrerId,
      points: referral.rewardPoints,
      source: 'referral',
      referenceId: referral.id,
      description: `Referral reward from ${referral.referredUserId}`,
      expiresAt: expiryDate,
    });
  
    // 2. Sum all unexpired points for the referrer
    const totalPoints = await UserPoint.sum('points', {
      where: {
        userId: referral.referrerId,
        expiresAt: { [Op.gt]: new Date() } // only unexpired points
      }
    });
  
    // 3. Determine partner type and commission based on total points and senior status
    const user = await User.findByPk(referral.referrerId);
    if (user) {
      let partnerType = 'referral';
      let commissionRate = 1.0;
      if (totalPoints > 17000) {
        if (user.isSeniorCitizen) {
          partnerType = 'hni';
          commissionRate = 2.5;
        } else {
          partnerType = 'authorised';
          commissionRate = 1.5;
        }
      }
      // update user's partnerType and partnerCommissionRate if changed
      if (user.partnerType !== partnerType || user.partnerCommissionRate !== commissionRate) {
        await user.update({
          partnerType,
          partnerCommissionRate: commissionRate
        });
      }
    }
  }));

  Referral.associate = (models) => {
    Referral.belongsTo(models.User, { foreignKey: 'referrerId', as: 'referrer' });
    Referral.belongsTo(models.User, { foreignKey: 'referredUserId', as: 'referredUser' });
    Referral.belongsTo(models.Offer, { foreignKey: 'offerId', as: 'offer' });
  };

  return Referral;
};