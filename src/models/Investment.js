const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Investment = sequelize.define('Investment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    InvestmentCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Format: INV-YYYYMM-XX (e.g. INV-202501-01)'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Plans', key: 'id' }
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: { min: 100000 }
    },
    investmentDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    maturityDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'matured', 'closed'),
      defaultValue: 'active'
    },
    agreementDoc: {
      type: DataTypes.STRING,
      comment: 'Path to agreement document'
    },
    certificateDoc: {
      type: DataTypes.STRING,
      comment: 'Path to investment certificate'
    },
    postChequeDoc: {
      type: DataTypes.STRING,
      comment: 'Path to post-dated cheque image/document'
    },
    dpcCheck: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'DPC check uploaded by admin'
    }
  },{
    hooks: {
      beforeCreate: async (invest) => {
       
        // Generate batch ID: KKFI-YYYYMM-XX
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const yearMonth = `${year}${month}`;
        const prefix = `INV${yearMonth}`;

        // Count existing users with batchId starting with this prefix
        const count = await sequelize.models.Investment.count({
          where: {
            InvestmentCode: {
              [Op.like]: `${prefix}`
            }
          }
        });

        // Next sequence number: count + 1, pad to 2 digits (will auto‑expand beyond 99)
        const nextNumber = count + 1;
        const paddedNumber = String(nextNumber).padStart(2, '0');
        invest.InvestmentCode = `${prefix}${paddedNumber}`;
      }
    }
  });

  Investment.associate = (models) => {
    Investment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Investment.belongsTo(models.Plan, {
      foreignKey: 'planId',
      as: 'plan'
  });
      Investment.hasMany(models.Return, { foreignKey: 'investmentId', as: 'returns' });
  };

  return Investment;
};