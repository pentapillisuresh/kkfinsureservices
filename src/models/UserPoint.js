const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserPoint = sequelize.define('UserPoint', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    source: {
      type: DataTypes.ENUM('login', 'referral', 'offer', 'other'),
      allowNull: false,
      comment: 'How the points were earned'
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Optional reference to source record (e.g., Referral.id or Offer.id)'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Human-readable description (e.g., "Referral reward", "Daily login bonus")'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Optional expiry date for points'
    }
  });

  UserPoint.associate = (models) => {
    UserPoint.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    // No direct association to Referral or Offer, but referenceId can be used for lookups.
  };

  return UserPoint;
};