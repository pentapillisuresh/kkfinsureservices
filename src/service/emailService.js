const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text alternative (optional)
 * @returns {Promise} - Nodemailer send result
 */
const sendEmail = async (to, subject, html, text = null) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"KKFINSUREAPP" <noreply@kkinsure.com>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '')
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

/**
 * Send login credentials to a new user.
 * @param {string} email - Recipient email
 * @param {string} password - Plain password (temporary)
 * @param {string} name - User's full name
 */
const sendCredentials = async (email, password, name) => {
  const subject = 'Welcome to KKFINSUREAPP - Your Login Credentials';
  const html = `
    <h2>Welcome to KKFINSUREAPP, ${name}!</h2>
    <p>Your account has been created successfully. Please login using the credentials below:</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Password:</strong> ${password}</p>
    <p>For security reasons, we recommend you change your password after first login.</p>
    <p>Login at: ${process.env.APP_URL || 'https://app.kkinsure.com'}</p>
    <p>Thank you for choosing KKFINSUREAPP!</p>
  `;
  await sendEmail(email, subject, html);
};

/**
 * Send monthly payout notification.
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @param {number} amount - Payout amount
 * @param {string} month - Month name
 */
const sendPayoutNotification = async (email, name, amount, month) => {
  const subject = `KKFINSUREAPP - Monthly Payout for ${month}`;
  const html = `
    <h2>Hello ${name},</h2>
    <p>Your monthly payout of <strong>₹${amount.toFixed(2)}</strong> has been credited for the month of ${month}.</p>
    <p>For any queries, please contact support.</p>
    <p>Thank you for investing with KKFINSUREAPP!</p>
  `;
  await sendEmail(email, subject, html);
};

/**
 * Send ticket resolution notification.
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @param {string} ticketSubject - Subject of ticket
 * @param {string} resolution - Resolution message
 */
const sendTicketResolution = async (email, name, ticketSubject, resolution) => {
  const subject = `KKFINSUREAPP - Ticket Resolved: ${ticketSubject}`;
  const html = `
    <h2>Hello ${name},</h2>
    <p>Your ticket regarding "${ticketSubject}" has been resolved.</p>
    <p><strong>Resolution:</strong> ${resolution}</p>
    <p>If you have any further questions, please reply to this email.</p>
  `;
  await sendEmail(email, subject, html);
};

/**
 * Send a generic notification email.
 * @param {string} email - Recipient email
 * @param {string} subject - Subject
 * @param {string} message - Message content (HTML)
 */
const sendNotification = async (email, subject, message) => {
  await sendEmail(email, subject, message);
};

module.exports = {
  sendEmail,
  sendCredentials,
  sendPayoutNotification,
  sendTicketResolution,
  sendNotification
};