/**
 * Application-wide constants
 */

// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  };
  
  // User roles
  const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin'
  };
  
  // Partner types
  const PARTNER_TYPES = {
    REFERRAL: 'referral',
    AUTHORISED: 'authorised',
    HNI: 'hni',
    NONE: 'none'
  };
  
  // Investment statuses
  const INVESTMENT_STATUS = {
    ACTIVE: 'active',
    MATURED: 'matured',
    CLOSED: 'closed'
  };
  
  // Return types
  const RETURN_TYPES = {
    MONTHLY: 'monthly',
    ANNUAL_BONUS: 'annual_bonus',
    QUARTERLY_SENIOR: 'quarterly_senior'
  };
  
  // Reward types for referrals/offers
  const REWARD_TYPES = {
    VOUCHER: 'voucher',
    POINTS: 'points',
    CASHBACK: 'cashback'
  };
  
  // Document types
  const DOCUMENT_TYPES = {
    KYC: 'kyc',
    AGREEMENT: 'agreement',
    COMPANY: 'company',
    OTHER: 'other'
  };
  
  // Ticket statuses
  const TICKET_STATUS = {
    OPEN: 'open',
    IN_PROGRESS: 'in-progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed'
  };
  
  // Commission statuses
  const COMMISSION_STATUS = {
    PENDING: 'pending',
    PAID: 'paid'
  };
  
  // User point sources
  const POINT_SOURCES = {
    LOGIN: 'login',
    REFERRAL: 'referral',
    OFFER: 'offer',
    OTHER: 'other'
  };
  
  // Default values
  const DEFAULTS = {
    MIN_INVESTMENT: 100000, // 1 Lakh
    MAX_INVESTMENT: 10000000, // 1 Crore
    MONTHLY_RETURN_MIN: 2,
    MONTHLY_RETURN_MAX: 4,
    ANNUAL_BONUS_PERCENT: 2,
    LOGIN_POINTS: 1,
    PASSWORD_MIN_LENGTH: 6
  };
  
  // Payout windows (1st–10th of each month)
  const PAYOUT_WINDOW = {
    START_DAY: 1,
    END_DAY: 10
  };
  
  // File upload limits
  const FILE_UPLOAD = {
    MAX_SIZE: 10 * 1024 * 1024, // 10 MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOC_TYPES: ['application/pdf']
  };
  
  module.exports = {
    HTTP_STATUS,
    USER_ROLES,
    PARTNER_TYPES,
    INVESTMENT_STATUS,
    RETURN_TYPES,
    REWARD_TYPES,
    DOCUMENT_TYPES,
    TICKET_STATUS,
    COMMISSION_STATUS,
    POINT_SOURCES,
    DEFAULTS,
    PAYOUT_WINDOW,
    FILE_UPLOAD
  };