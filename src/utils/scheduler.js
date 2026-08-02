/**
 * Scheduled jobs using node-cron
 * Run monthly tasks: generate returns, process partner commissions, etc.
 * This file is optional – can be used in server.js if needed.
 */
const cron = require('node-cron');
const sequelize = require('../config/database');
const {Investment} = require('../models');
const {Plan} = require('../models');
const {User} = require('../models');
const {PartnerTier} = require('../models');
const {Return} = require('../models');
const {Referral} = require('../models');
const {PartnerCommission} = require('../models');
const {UserPoint} = require('../models');

const { Op } = require('sequelize');
const { calculateMonthlyReturn, calculateAnnualBonus, isSeniorCitizen } = require('./helpers');

/**
 * Generate monthly returns for all active investments.
 * This should run on the 1st of every month at 00:00.
 */
const generateMonthlyReturns = async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log('[Scheduler] Generating monthly returns...');

    // Get all active investments where maturity date > current date
    const investments = await Investment.findAll({
      where: {
        status: 'active',
        maturityDate: { [Op.gt]: new Date() }
      },
      include: [
        { model: User, as: 'user' },
        { model: Plan, as: 'plan' }
      ],
      transaction
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const investment of investments) {
      const user = investment.user;
      const plan = investment.plan;
      const monthlyAmount = calculateMonthlyReturn(investment.amount, plan.monthlyReturnPercent);

      // Check if senior citizen – if so, quarterly instead of monthly
      const isSenior = user.isSeniorCitizen || isSeniorCitizen(user.dateOfBirth);
      let returnType = 'monthly';
      if (isSenior) {
        // For seniors, we might generate quarterly on first month of quarter
        const month = now.getMonth();
        if (month % 3 === 0) {
          returnType = 'quarterly_senior';
        } else {
          // Skip this month for seniors (only generate quarterly)
          continue;
        }
      }

      await Return.create({
        investmentId: investment.id,
        userId: user.id,
        month: monthStart,
        amount: returnType === 'quarterly_senior' ? monthlyAmount * 3 : monthlyAmount,
        type: returnType,
        paidOn: null // will be marked paid during payout window
      }, { transaction });

      console.log(`Return generated for investment ${investment.id}, user ${user.id}`);
    }

    // Also generate annual bonuses (once a year)
    // This could be done separately – for simplicity we'll handle in a separate function.

    await transaction.commit();
    console.log('[Scheduler] Monthly returns generation completed.');
  } catch (error) {
    await transaction.rollback();
    console.error('[Scheduler] Error generating monthly returns:', error);
    throw error;
  }
};

/**
 * Generate annual bonuses for investments that have completed one year.
 * Should be run on Jan 1st or on investment anniversary.
 */
const generateAnnualBonuses = async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log('[Scheduler] Generating annual bonuses...');

    // For simplicity, find investments whose investment date is exactly one year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const investments = await Investment.findAll({
      where: {
        status: 'active',
        investmentDate: {
          [Op.between]: [
            new Date(oneYearAgo.getFullYear(), oneYearAgo.getMonth(), oneYearAgo.getDate(), 0, 0, 0),
            new Date(oneYearAgo.getFullYear(), oneYearAgo.getMonth(), oneYearAgo.getDate(), 23, 59, 59)
          ]
        }
      },
      include: [{ model: Plan, as: 'plan' }],
      transaction
    });

    for (const investment of investments) {
      const bonusAmount = calculateAnnualBonus(investment.amount, investment.plan.annualBonusPercent);
      await Return.create({
        investmentId: investment.id,
        userId: investment.userId,
        month: new Date(),
        amount: bonusAmount,
        type: 'annual_bonus',
        paidOn: null
      }, { transaction });
      console.log(`Annual bonus generated for investment ${investment.id}`);
    }

    await transaction.commit();
    console.log('[Scheduler] Annual bonuses generation completed.');
  } catch (error) {
    await transaction.rollback();
    console.error('[Scheduler] Error generating annual bonuses:', error);
    throw error;
  }
};

/**
 * Process partner commissions for the previous month.
 * Should run on the 1st of each month.
 */
const processPartnerCommissions = async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log('[Scheduler] Processing partner commissions...');

    const now = new Date();
    // Previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get all users who are partners (referral, authorised, hni)
    const partners = await User.findAll({
      where: {
        partnerType: { [Op.in]: ['referral', 'authorised', 'hni'] },
        isActive: true
      },
      transaction
    });

    for (const partner of partners) {
      // Get total active investments from referred users
      const referrals = await Referral.findAll({
        where: { referrerId: partner.id },
        include: [
          {
            model: User,
            as: 'referredUser',
            include: [{ model: Investment, as: 'investments', where: { status: 'active' } }]
          }
        ],
        transaction
      });

      // Sum up active investment amounts from referred users
      let totalBase = 0;
      for (const ref of referrals) {
        const investments = ref.referredUser?.investments || [];
        for (const inv of investments) {
          totalBase += parseFloat(inv.amount);
        }
      }

      // Determine tier and rate
      const tier = partner.partnerType; // Could also determine dynamically
      const tierDef = await PartnerTier.findOne({
        where: { name: tier, isActive: true },
        transaction
      });
      const rate = tierDef ? parseFloat(tierDef.commissionRate) : partner.partnerCommissionRate;

      const commissionAmount = (totalBase * rate) / 100;

      if (commissionAmount > 0) {
        await PartnerCommission.create({
          partnerId: partner.id,
          month: prevMonth,
          totalInvestmentBase: totalBase,
          commissionRate: rate,
          commissionAmount: commissionAmount,
          status: 'pending'
        }, { transaction });
        console.log(`Commission processed for partner ${partner.id}: ₹${commissionAmount}`);
      }
    }

    await transaction.commit();
    console.log('[Scheduler] Partner commissions processing completed.');
  } catch (error) {
    await transaction.rollback();
    console.error('[Scheduler] Error processing partner commissions:', error);
    throw error;
  }
};

/**
 * Add login points to users (daily).
 * Run daily at 00:00.
 */
const addLoginPoints = async () => {
  try {
    console.log('[Scheduler] Adding login points...');
    const users = await User.findAll({ where: { isActive: true } });
    for (const user of users) {
      await UserPoint.create({
        userId: user.id,
        points: 1, // 1 point per login day
        source: 'login',
        description: 'Daily login bonus'
      });
    }
    console.log('[Scheduler] Login points added for all users.');
  } catch (error) {
    console.error('[Scheduler] Error adding login points:', error);
  }
};

/**
 * Initialize all scheduled jobs.
 * Call this function from server.js to start cron jobs.
 */
const initializeScheduler = () => {
  // Run monthly return generation on 1st of every month at 00:05
  cron.schedule('5 0 1 * *', async () => {
    console.log('[Cron] Running monthly returns generation...');
    try {
      await generateMonthlyReturns();
      await generateAnnualBonuses(); // Also check for annual bonuses
      await processPartnerCommissions(); // Process commissions for previous month
    } catch (error) {
      console.error('[Cron] Failed to run monthly jobs:', error);
    }
  });

  // Run daily login points at 00:10
  cron.schedule('10 0 * * *', async () => {
    console.log('[Cron] Running daily login points...');
    try {
      await addLoginPoints();
    } catch (error) {
      console.error('[Cron] Failed to add login points:', error);
    }
  });

  // Optional: Run weekly or hourly tasks as needed
  console.log('[Scheduler] All cron jobs scheduled.');
};

module.exports = {
  initializeScheduler,
  generateMonthlyReturns,
  generateAnnualBonuses,
  processPartnerCommissions,
  addLoginPoints
};