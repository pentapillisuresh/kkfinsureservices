/**
 * Common utility functions
 */
const { DEFAULTS, PAYOUT_WINDOW } = require('./constants');

/**
 * Generate a random alphanumeric string
 * @param {number} length - Length of the string
 * @returns {string}
 */
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format a date to YYYY-MM-DD
 * @param {Date|string} date - Date object or string
 * @returns {string}
 */
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a date to DD-MM-YYYY
 * @param {Date|string} date
 * @returns {string}
 */
const formatDateDDMMYYYY = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
};

/**
 * Check if a date is within the payout window (1st–10th of month)
 * @param {Date} date
 * @returns {boolean}
 */
const isWithinPayoutWindow = (date) => {
  const day = date.getDate();
  return day >= PAYOUT_WINDOW.START_DAY && day <= PAYOUT_WINDOW.END_DAY;
};

/**
 * Get the first day of a given month
 * @param {number} year - e.g., 2026
 * @param {number} month - 0-indexed (0 = January)
 * @returns {Date}
 */
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1);
};

/**
 * Get the last day of a given month
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Date}
 */
const getLastDayOfMonth = (year, month) => {
  return new Date(year, month + 1, 0);
};

/**
 * Calculate maturity date based on investment date and maturity period (in months)
 * @param {Date} investmentDate
 * @param {number} maturityPeriodMonths
 * @returns {Date}
 */
const calculateMaturityDate = (investmentDate, maturityPeriodMonths) => {
  const date = new Date(investmentDate);
  date.setMonth(date.getMonth() + maturityPeriodMonths);
  return date;
};

/**
 * Check if a user is a senior citizen (age >= 60)
 * @param {string|Date} dateOfBirth - DOB string or Date object
 * @returns {boolean}
 */
const isSeniorCitizen = (dateOfBirth) => {
  if (!dateOfBirth) return false;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 60;
};

/**
 * Calculate monthly return amount
 * @param {number} investmentAmount
 * @param {number} monthlyReturnPercent
 * @returns {number}
 */
const calculateMonthlyReturn = (investmentAmount, monthlyReturnPercent) => {
  return (investmentAmount * monthlyReturnPercent) / 100;
};

/**
 * Calculate annual bonus
 * @param {number} investmentAmount
 * @param {number} annualBonusPercent
 * @returns {number}
 */
const calculateAnnualBonus = (investmentAmount, annualBonusPercent) => {
  return (investmentAmount * annualBonusPercent) / 100;
};

/**
 * Determine partner tier based on total referred investment
 * @param {number} totalInvestment - Sum of investments from referred users
 * @returns {string} 'referral', 'authorised', 'hni', or 'none'
 */
const determinePartnerTier = (totalInvestment) => {
  if (totalInvestment >= 4000000) return 'hni';
  if (totalInvestment >= 1600000) return 'authorised';
  if (totalInvestment >= 100000) return 'referral';
  return 'none';
};

/**
 * Get commission rate for a given partner tier
 * @param {string} tier - 'referral', 'authorised', 'hni'
 * @returns {number} Commission rate as percentage
 */
const getCommissionRateForTier = (tier) => {
  const rates = {
    referral: 1.0,
    authorised: 1.5,
    hni: 1.5
  };
  return rates[tier] || 0;
};

/**
 * Mask sensitive data (e.g., email, phone)
 * @param {string} value - Data to mask
 * @param {string} type - 'email' or 'phone'
 * @returns {string}
 */
const maskData = (value, type = 'email') => {
  if (!value) return '';
  if (type === 'email') {
    const [local, domain] = value.split('@');
    if (local.length <= 2) return value;
    return local[0] + '***' + local[local.length - 1] + '@' + domain;
  }
  if (type === 'phone') {
    if (value.length <= 4) return value;
    return value.slice(0, 2) + '****' + value.slice(-2);
  }
  return value;
};

/**
 * Truncate text to a specified length
 * @param {string} text
 * @param {number} maxLength
 * @param {string} suffix - e.g., '...'
 * @returns {string}
 */
const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
};

module.exports = {
  generateRandomString,
  formatDate,
  formatDateDDMMYYYY,
  isWithinPayoutWindow,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  calculateMaturityDate,
  isSeniorCitizen,
  calculateMonthlyReturn,
  calculateAnnualBonus,
  determinePartnerTier,
  getCommissionRateForTier,
  maskData,
  truncateText
};