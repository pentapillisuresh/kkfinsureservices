const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {

// 1. Define the model first
const Referral = sequelize.define('Referral', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true
},

referrerId: {
  type: DataTypes.UUID,
  allowNull: false,
  references: {
    model: 'Users',
    key: 'id'
  },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
},

referredUserId: {
  type: DataTypes.UUID,
  allowNull: false,
  references: {
    model: 'Users',
    key: 'id'
  },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
},

investmentAmount: {
  type: DataTypes.DECIMAL(15, 2),
  allowNull: true
},

rewardPoints: {
  type: DataTypes.INTEGER,
  defaultValue: 0
},

rewardValue: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: 'Value of voucher/points/cashback'
},

offerId: {
  type: DataTypes.UUID,
  allowNull: true,
  references: {
    model: 'Offers',
    key: 'id'
  },
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
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
}

});

// 2. Add hook AFTER model is created
Referral.addHook('afterCreate', async (referral, options) => {

const UserPoint = sequelize.models.UserPoint;
const User = sequelize.models.User;

// Add reward points
if (referral.rewardPoints > 0) {

  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  await UserPoint.create({
    userId: referral.referrerId,
    points: referral.rewardPoints,
    source: 'referral',
    referenceId: referral.id,
    description: `Referral reward from ${referral.referredUserId}`,
    expiresAt: expiryDate
  }, {
    transaction: options.transaction
  });
}


// Calculate unexpired points
const totalPoints = await UserPoint.sum('points', {
  where: {
    userId: referral.referrerId,
    expiresAt: {
      [Op.gt]: new Date()
    }
  },
  transaction: options.transaction
}) || 0;


// Get referrer
const user = await User.findByPk(
  referral.referrerId,
  {
    transaction: options.transaction
  }
);

if (!user) {
  return;
}


// Determine partner type
let partnerType = 'referral';
let commissionRate = 1.0;

if (totalPoints >= 17000) {

  if (user.isSeniorCitizen) {
    partnerType = 'hni';
    commissionRate = 2.5;
  } else {
    partnerType = 'authorised';
    commissionRate = 1.5;
  }
}


// Update user if required
if (
  user.partnerType !== partnerType ||
  Number(user.partnerCommissionRate) !== commissionRate
) {

  await user.update({
    partnerType,
    partnerCommissionRate: commissionRate
  }, {
    transaction: options.transaction
  });
}

});

// 3. Associations
Referral.associate = (models) => {

Referral.belongsTo(models.User, {
  foreignKey: 'referrerId',
  as: 'referrer'
});

Referral.belongsTo(models.User, {
  foreignKey: 'referredUserId',
  as: 'referredUser'
});

Referral.belongsTo(models.Offer, {
  foreignKey: 'offerId',
  as: 'offer'
});

};

// 4. Return model
return Referral;
};
