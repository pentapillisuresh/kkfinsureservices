const { DataTypes } = require('sequelize');
const { Op, Sequelize } = require('sequelize');

const bcrypt = require('bcryptjs');

module.exports = (sequelize, D) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: { 
      type: DataTypes.STRING,
      allowNull: false,
      // unique: true,
      validate: { isEmail: true }
    },
    batchId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Format: KKFI-YYYYMM-XX (e.g. KKFI-202501-01)'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      validate: { is: /^[0-9]{10}$/ }
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY
    },
    pan: {
      type: DataTypes.STRING,
      validate: { is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ }
    },
    aadhar: {
      type: DataTypes.STRING,
      validate: { is: /^[0-9]{12}$/ }
    },
    address: {
      type: DataTypes.TEXT
    },
    nomineeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Nominees', key: 'id' }
    },
    isSeniorCitizen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    partnerType: {
      type: DataTypes.ENUM('referral', 'authorised', 'hni', 'none'),
      defaultValue: 'none'
    },
    partnerCommissionRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        // Generate batch ID: KKFI-YYYYMM-XX
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const yearMonth = `${year}${month}`;
        const prefix = `KKFI${yearMonth}`;

        // Count existing users with batchId starting with this prefix
        const count = await sequelize.models.User.count({
          where: {
            batchId: {
              [Op.like]: `${prefix}`
            }
          }
        });

        // Next sequence number: count + 1, pad to 2 digits (will auto‑expand beyond 99)
        const nextNumber = count + 1;
        const paddedNumber = String(nextNumber).padStart(2, '0');
        user.batchId = `${prefix}${paddedNumber}`;
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Instance method to compare password
  User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Associations
  User.associate = (models) => {
    User.belongsTo(models.Nominee, { foreignKey: 'nomineeId', as: 'nominee' });
    User.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    User.hasMany(models.Investment, { foreignKey: 'userId', as: 'investments' });
    User.hasMany(models.Return, { foreignKey: 'userId', as: 'returns' });
    User.hasMany(models.Referral, { foreignKey: 'referrerId', as: 'referralsGiven' });
    User.hasMany(models.Referral, { foreignKey: 'referredUserId', as: 'referralsReceived' });
    User.hasMany(models.Ticket, { foreignKey: 'userId', as: 'tickets' });
    User.hasMany(models.Document, { foreignKey: 'userId', as: 'documents' });
    User.hasMany(models.BalanceSheet, { foreignKey: 'userId', as: 'balanceSheets' });
    User.hasMany(models.PartnerCommission, { foreignKey: 'partnerId', as: 'commissions' });
    User.hasMany(models.UserPoint, { foreignKey: 'userId', as: 'points' });
    User.hasOne(models.BankDetail, { foreignKey: 'userId', as: 'bankDetail' });
  };

  return User;
};