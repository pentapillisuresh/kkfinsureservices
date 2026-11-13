const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InvestmentForm = sequelize.define('InvestmentForm', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        // Link to actual User if applicable
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            comment: 'Optional link if the investor is already registered in the system'
        },

        // ==========================================
        // INVESTOR DETAILS
        // ==========================================
        investorName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        age: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY
        },
        isSeniorCitizen: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        panCardNo: {
            type: DataTypes.STRING,
            validate: { is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ }
        },
        investorAadhar: {
            type: DataTypes.STRING,
            validate: { is: /^[0-9]{12}$/ }
        },
        investorEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isEmail: true }
        },
        investorAddress: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        investorDocumentName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        investorDocumentPath: {
            type: DataTypes.STRING,
            allowNull: true
        },
        district: {
            type: DataTypes.STRING,
            allowNull: true
        },
        state: {
            type: DataTypes.STRING,
            allowNull: true
        },
        pincode: {
            type: DataTypes.STRING,
            allowNull: true
        },

        // ==========================================
        // BANK DETAILS (PAYOUT)
        // ==========================================
        bankNameBranch: {
            type: DataTypes.STRING,
            allowNull: true
        },
        accountNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ifscCode: {
            type: DataTypes.STRING,
            allowNull: true
        },
        investorMobile: {
            type: DataTypes.STRING,
            allowNull: true
        },

        // ==========================================
        // NOMINEE DETAILS
        // ==========================================
        nomineeName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        nomineeRelationship: {
            type: DataTypes.STRING,
            allowNull: true
        },
        nomineePhone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        nomineeAadhar: {
            type: DataTypes.STRING,
            allowNull: true
        },
        nomineeEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: { isEmail: true }
        },
        nomineeAddress: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        nomineeDocumentName: {
            type: DataTypes.STRING,
            comment: 'Path to nominee identity document'
        },
        nomineeDocumentPath: {
            type: DataTypes.STRING,
            comment: 'Path to nominee identity document'
        },

        // ==========================================
        // INVESTMENT DETAILS
        // ==========================================
        introducerName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        planId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Plans', key: 'id' }
        },
        investedBy: {
            type: DataTypes.STRING,
            allowNull: true
        },
        investmentDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        paymentMode: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'CHEQUE / RTGS / NEFT / CASH / UPI'
        },
        chequeTransferDetails: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // ==========================================
        // SIGNATURES & DOCUMENTS
        // ==========================================

        isDisclimerCheck: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'DPC check uploaded by admin'
        },
        attachedFormFile: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Path to the scanned PDF/Image of the physical form'
        }
    }, {
        timestamps: true
    });

    InvestmentForm.associate = (models) => {
        InvestmentForm.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        InvestmentForm.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
    };

    return InvestmentForm;
};