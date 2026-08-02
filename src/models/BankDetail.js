const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BankDetail = sequelize.define('BankDetail', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    accountHolderName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[0-9]{9,18}$/ // typical account number length
      }
    },
    ifscCode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[A-Z]{4}0[A-Z0-9]{6}$/ // IFSC format
      }
    },
    branch: {
      type: DataTypes.STRING
    },
    accountType: {
      type: DataTypes.ENUM('savings', 'current', 'salary'),
      defaultValue: 'savings'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Admin verification flag'
    }
  });

  BankDetail.associate = (models) => {
    BankDetail.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return BankDetail;
};