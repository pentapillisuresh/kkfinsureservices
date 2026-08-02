const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Nominee = sequelize.define('Nominee', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    relation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      validate: { is: /^[0-9]{10}$/ }
    },
    email: {
      type: DataTypes.STRING,
      validate: { isEmail: true }
    },
    address: {
      type: DataTypes.TEXT
    },
    documentPath: {
      type: DataTypes.STRING,
      comment: 'Path to nominee identity document'
    }
  });

  Nominee.associate = (models) => {
    Nominee.hasOne(models.User, { foreignKey: 'nomineeId', as: 'user' });
  };

  return Nominee;
};