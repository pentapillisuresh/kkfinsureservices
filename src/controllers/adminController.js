const { Op } = require('sequelize');
const sequelize = require('../config/database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { User } = require('../models');
const { Investment } = require('../models');
const { Nominee } = require('../models');
const { Plan } = require('../models');
const { Document } = require('../models');
const { BalanceSheet } = require('../models');
const { Return } = require('../models');
const { Referral } = require('../models');
const { Ticket } = require('../models');
const { BankDetail } = require('../models');
const {PartnerCommission} = require('../models');

const { formatDate, calculateMaturityDate } = require('../utils/helpers');

// Ensure upload directory exists
const balanceSheetDir = path.join(__dirname, '../../uploads/balance-sheets');
if (!fs.existsSync(balanceSheetDir)) {
  fs.mkdirSync(balanceSheetDir, { recursive: true });
}

const generatePDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Balance Sheet', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`User: ${data.user.fullName} (${data.user.email})`, { align: 'center' });
      doc.text(`Period: ${new Date(data.summary.period.start).toLocaleDateString()} - ${new Date(data.summary.period.end).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Investments: ${data.summary.totalInvestments.toFixed(2)}`);
      doc.text(`Total Returns: ${data.summary.totalReturns.toFixed(2)}`);
      doc.text(`Total Commissions: ${data.summary.totalCommissions.toFixed(2)}`);
      doc.text(`Net Worth: ${data.summary.netWorth.toFixed(2)}`);
      doc.moveDown();

      // Transactions
      doc.fontSize(14).text('Transactions', { underline: true });
      doc.fontSize(10);
      const tableHeaders = ['Date', 'Description', 'Amount', 'Balance'];
      let y = doc.y;
      // Draw table header
      const colWidths = [80, 200, 100, 100];
      const xStart = 50;
      doc.font('Helvetica-Bold');
      doc.text('Date', xStart, y, { width: colWidths[0], continued: true });
      doc.text('Amount', xStart + colWidths[0] + colWidths[1], y, { width: colWidths[2], continued: true });
      doc.text('Balance', xStart + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      y += 20;
      doc.font('Helvetica');

      // Transactions rows
      for (const tx of data.transactions) {
        const amt = tx.amount < 0 ? `-${Math.abs(tx.amount).toFixed(2)}` : `${tx.amount.toFixed(2)}`;
        const bal = `${tx.balance.toFixed(2)}`;
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.text(tx.formattedDate, xStart, y, { width: colWidths[0], continued: true });
        doc.text(amt, xStart + colWidths[0] + colWidths[1], y, { width: colWidths[2], continued: true });
        doc.text(bal, xStart + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
        y += 20;
      }

      // Footer
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const generateExcelFile = (data, userId) => {
  const { summary, transactions = [], user } = data;

  // ============================================================
  // 1. Summary Sheet
  // ============================================================
  
  const summaryData = [
  ['Balance Sheet Summary'],
  [''],
  
  ['User', user?.fullName || ''],
  ['Email', user?.email || ''],
  ['User ID', user?.id || userId || ''],
  
  [''],
  
  [
    'Period Start',
    summary?.period?.start
      ? new Date(summary.period.start).toLocaleDateString('en-IN')
      : ''
  ],
  [
    'Period End',
    summary?.period?.end
      ? new Date(summary.period.end).toLocaleDateString('en-IN')
      : ''
  ],
  
  [''],
  
  [
    'Total Investments (Outflow)',
    Number(summary?.totalInvestments || 0)
  ],
  [
    'Total Returns (Inflow)',
    Number(summary?.totalReturns || 0)
  ],
  [
    'Total Commissions (Inflow)',
    Number(summary?.totalCommissions || 0)
  ],
  [
    'Total Inflow',
    Number(summary?.totalInflow || 0)
  ],
  [
    'Total Outflow',
    Number(summary?.totalOutflow || 0)
  ],
  [
    'Net Worth',
    Number(summary?.netWorth || 0)
  ],
  
  [''],
  
  ['Generated At', new Date().toLocaleString('en-IN')]
  
  ];
  
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  
  // ============================================================
  // 2. Transactions Sheet
  // ============================================================
  
  const transactionRows = [
    [
      'Date',
      'Description',
      'Type',
      'Amount (₹)',
      'Reference ID',
      'Balance (₹)'
    ]
  ];
    console.log("transactions:::",transactions)
  // Make sure transactions is an array
  if (Array.isArray(transactions)) {
    console.log("is Array transactions:::",Array.isArray(transactions))

  transactions.forEach((tx) => {
  // Use formattedDate from API if available.
  // Otherwise format the date ourselves.
  let transactionDate = tx.formattedDate || '';
  console.log("transactionDate:::",transactionDate)
  if (!transactionDate && tx.date) {
      transactionDate = new Date(tx.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  
    transactions.forEach((tx) => {
      transactionRows.push([
        tx.formattedDate || '',
        tx.description || '',
        tx.type || '',
        Number(tx.amount || 0),
        tx.referenceId || '',
        Number(tx.balance || 0)
      ]);
    });
  });
  console.log("transactionRows:::",transactionRows)
  }
  
  const transactionWS = XLSX.utils.aoa_to_sheet(transactionRows);
  console.log("transactionRows:::",transactionRows)
  // ============================================================
  // 3. Column widths
  // ============================================================
  
  summaryWS['!cols'] = [
  { wch: 30 },
  { wch: 35 }
  ];
  
  transactionWS['!cols'] = [
  { wch: 18 }, // Date
  { wch: 18 }, // Type
  { wch: 18 }, // Amount
  { wch: 40 }, // Reference ID
  { wch: 18 }  // Balance
  ];
  
  // ============================================================
  // 4. Workbook
  // ============================================================
  
  const wb = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(
  wb,
  summaryWS,
  'Summary'
  );
  
  XLSX.utils.book_append_sheet(
  wb,
  transactionWS,
  'Transactions'
  );
  
  // ============================================================
  // 5. Write Excel file
  // ============================================================
  
  const timestamp = Date.now();
  
  const filename = `balance-sheet-${userId}-${timestamp}.xlsx`;
  
  const filePath = path.join(
  balanceSheetDir,
  filename
  );
  
  XLSX.writeFile(wb, filePath);
  
  return {
  filename,
  filePath
  };
  };
  
/**
 * Get all users with pagination and filters
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, partnerType, isActive } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (partnerType) where.partnerType = partnerType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: Nominee, as: 'nominee' },
        { model: BankDetail, as: 'bankDetail' },
        { model: Document, as: 'documents' },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, 'Users fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getDropdownUsers = async (req, res) => {
  try {

    const where = {};
    where.role = "user";
    where.isActive = true;

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, { users }, 'Users fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get user details by ID
 */
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Nominee, as: 'nominee' },
        { model: BankDetail, as: 'bankDetail' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: Investment, as: 'investments' },
        { model: Return, as: 'returns' },
        { model: Document, as: 'documents' },
      ]
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update user details (admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, dateOfBirth, batchId, pan, aadhar, address, nomineeId, isSeniorCitizen, partnerType, partnerCommissionRate, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Update allowed fields
    await user.update({
      fullName: fullName || user.fullName,
      phone: phone || user.phone,
      dateOfBirth: dateOfBirth || user.dateOfBirth,
      pan: pan || user.pan,
      aadhar: aadhar || user.aadhar,
      batchId: batchId || user.batchId,
      address: address || user.address,
      nomineeId: nomineeId || user.nomineeId,
      isSeniorCitizen: isSeniorCitizen !== undefined ? isSeniorCitizen : user.isSeniorCitizen,
      partnerType: partnerType || user.partnerType,
      partnerCommissionRate: partnerCommissionRate !== undefined ? partnerCommissionRate : user.partnerCommissionRate,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    return successResponse(res, { id: user.id }, 'User updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Toggle user active status
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    user.isActive = !user.isActive;
    await user.save();

    return successResponse(res, { id: user.id, isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Dashboard stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { role: 'user' } });
    const activeInvestments = await Investment.count({ where: { status: 'active' } });
    const totalInvestmentAmount = await Investment.sum('amount', { where: { status: 'active' } });
    const pendingTickets = await Ticket.count({ where: { status: 'open' } });

    // Monthly stats (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const newUsersThisMonth = await User.count({
      where: {
        role: 'user',
        createdAt: { [Op.between]: [monthStart, monthEnd] }
      }
    });

    const returnsThisMonth = await Return.sum('amount', {
      where: {
        month: { [Op.between]: [monthStart, monthEnd] }
      }
    });

    return successResponse(res, {
      totalUsers,
      activeInvestments,
      totalInvestmentAmount: totalInvestmentAmount || 0,
      pendingTickets,
      newUsersThisMonth,
      returnsThisMonth: returnsThisMonth || 0
    }, 'Dashboard stats fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Approve DPC check for an investment
 */
const approveDPC = async (req, res) => {
  try {
    const { id } = req.params;
    const investment = await Investment.findByPk(id);
    if (!investment) {
      return errorResponse(res, 'Investment not found', 404);
    }

    investment.dpcCheck = true;
    await investment.save();

    return successResponse(res, { id: investment.id, dpcCheck: true }, 'DPC approved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Upload company document
 */
const uploadCompanyDocument = async (req, res) => {
  try {
    const { title, type } = req.body;
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const document = await Document.create({
      userId: null, // company document
      type: type || 'company',
      title,
      filePath: req.file.path,
      uploadedBy: req.user.id
    });

    const fullUrl = `${process.env.BASE_URL}/${document.filePath.replace(/\\/g, '/')}`;
    return successResponse(res, { ...document.toJSON(), filePath: fullUrl }, 'Company document uploaded successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get company documents
 */
const getCompanyDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { userId: null, type: 'company' },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    // Add full URL
    const docsWithUrl = documents.map(doc => ({
      ...doc.toJSON(),
      filePath: `${process.env.BASE_URL}/${doc.filePath.replace(/\\/g, '/')}`
    }));

    return successResponse(res, docsWithUrl, 'Company documents fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete company document
 */
const deleteCompanyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findOne({ where: { id, userId: null, type: 'company' } });
    if (!doc) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Optionally delete file from filesystem
    const fs = require('fs');
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await doc.destroy();
    return successResponse(res, null, 'Company document deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Generate balance sheet for a user (admin)
 */

/**
 * Generate an Excel file from balance sheet data
 */

const generateBalanceSheet = async (req, res) => {
  try {
    const { userId, periodStart, periodEnd } = req.body;
    if (!userId || !periodStart || !periodEnd) {
      return errorResponse(res, 'userId, periodStart, and periodEnd are required', 400);
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // 1. Validate user
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // 2. Fetch investments (outflow)
    const investments = await Investment.findAll({
      where: {
        userId,
        investmentDate: { [Op.between]: [start, end] }
      },
      attributes: ['id', 'amount', 'investmentDate', 'planId', 'status']
    });

    // 3. Fetch returns (inflow)
    const returns = await Return.findAll({
      where: {
        userId,
        paidOn: { [Op.between]: [start, end] }
      },
      attributes: ['id', 'amount', 'paidOn', 'type']
    });

    // 4. Fetch partner commissions (inflow)
    const commissions = await PartnerCommission.findAll({
      where: {
        partnerId: userId,
        paidOn: { [Op.between]: [start, end] },
        status: 'paid'
      },
      attributes: ['id', 'commissionAmount', 'paidOn', 'month']
    });

    // 5. Build transaction list
    const transactions = [];

    // Investments (outflow)
    for (const inv of investments) {
      transactions.push({
        date: inv.investmentDate,
        description: `Investment in Plan ${inv.planId}`,
        type: 'investment',
        amount: -parseFloat(inv.amount),
        referenceId: inv.id
      });
    }

    // Returns (inflow)
    for (const ret of returns) {
      transactions.push({
        date: ret.paidOn,
        description: `Return (${ret.type})`,
        type: 'return',
        amount: parseFloat(ret.amount),
        referenceId: ret.id
      });
    }

    // Partner Commissions (inflow)
    for (const com of commissions) {
      transactions.push({
        date: com.paidOn,
        description: `Partner Commission for ${com.month}`,
        type: 'commission',
        amount: parseFloat(com.commissionAmount),
        referenceId: com.id
      });
    }

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Running balance
    let runningBalance = 0;
    const statement = transactions.map(t => {
      runningBalance += t.amount;
      return {
        ...t,
        balance: runningBalance,
        formattedDate: new Date(t.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      };
    });

    // Totals
    const totalOutflow = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const totalReturns = returns.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalCommissions = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0);
    const totalInflow = totalReturns + totalCommissions;
    const netWorth = totalInflow - totalOutflow;

    // Prepare data object
    const balanceSheetData = {
      summary: {
        period: { start: start.toISOString(), end: end.toISOString() },
        totalInvestments: totalOutflow,
        totalReturns,
        totalCommissions,
        totalInflow,
        totalOutflow,
        netWorth
      },
      transactions: statement,
      user: {
        id: user.id,
        fullName: user.fullName, 
        email: user.email
      }
    };

    // Save balance sheet record first (without file)
    const balanceSheet = await BalanceSheet.create({
      userId,
      periodStart: start,
      periodEnd: end,
      totalInvestments: totalOutflow,
      totalReturns,
      totalPartnerCommissions: totalCommissions,
      netWorth,
      generatedAt: new Date(),
      balanceSheetFile: null // placeholder
    });

    // Generate Excel file
    const { filename, filePath } = generateExcelFile(balanceSheetData, userId);

    // Update balance sheet record with file path
    const relativePath = `uploads/balance-sheets/${filename}`;
    balanceSheet.balanceSheetFile = relativePath;
    await balanceSheet.save();

    // Build full URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fileUrl = `${baseUrl}/${relativePath}`;

    return successResponse(res, {
      ...balanceSheetData,
      recordId: balanceSheet.id,
      fileUrl,
      filePath: relativePath
    }, 'Balance sheet generated and Excel file saved successfully');
  } catch (error) {
    console.error('Balance Sheet Error:', error);
    return errorResponse(res, error.message, 500);
  }
};

const getAllBalanceSheet = async (req, res) => {
  try {
    const { page = 1 } = req.query;

    const limit = 10;

    const currentPage = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    const offset = (currentPage - 1) * limit;

    const {
      count,
      rows: balanceSheets,
    } = await BalanceSheet.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(count / limit);

    return successResponse(
      res,
      {
        balanceSheets,
        pagination: {
          currentPage,
          perPage: limit,
          totalItems: count,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
      },
      'Balance sheets fetched successfully'
    );

  } catch (error) {
    console.error('Get balance sheet error:', error);

    return errorResponse(
      res,
      error.message || 'Failed to fetch balance sheets',
      500
    );
  }
};
/**
* Get audit logs (placeholder)
*/
const getAuditLogs = async (req, res) => {
  // This could be implemented with a dedicated logs table
  return successResponse(res, [], 'Audit logs feature coming soon');
};

module.exports = {
  getAllUsers,
  getUserDetails,
  updateUser,
  toggleUserStatus,
  getDashboardStats,
  approveDPC,
  getDropdownUsers,
  uploadCompanyDocument,
  getCompanyDocuments,
  deleteCompanyDocument,
  generateBalanceSheet,
  getAllBalanceSheet,
  getAuditLogs
};