const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      comment: 'Null for company documents'
    },
    type: {
      type: DataTypes.ENUM('kyc', 'agreement','Statement', 'company', 'other'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Path to uploaded file'
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      comment: 'Admin who uploaded'
    }
  });

  Document.associate = (models) => {
    Document.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Document.belongsTo(models.User, { foreignKey: 'uploadedBy', as: 'uploader' });
  };

  return Document;
};