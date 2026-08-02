const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
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
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.ENUM('open', 'in-progress', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    resolution: {
      type: DataTypes.TEXT
    }
  });

  Ticket.associate = (models) => {
    Ticket.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Ticket;
};