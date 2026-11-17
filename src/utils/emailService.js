const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or your preferred email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});

/**
 * Sends an email with the PDF link
 */
const sendFormPdfEmail = async (investorName, pdfUrl) => {
  const mailOptions = {
    from: `"KK Finsure Support" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `New Investment Form Submitted - ${investorName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2B46D5; text-align: center;">KK Finsure</h2>
        <p>Hello Support Team,</p>
        <p>A new investment form has been submitted by <strong>${investorName}</strong>.</p>
        <p>The PDF document has been generated successfully and saved to the server.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" 
             style="background-color: #2B46D5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Download PDF Form
          </a>
        </div>

        <p style="font-size: 12px; color: #888;">
          If the button doesn't work, copy and paste this link into your browser: <br/>
          <a href="${pdfUrl}">${pdfUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">
          &copy; ${new Date().getFullYear()} KK Finsure Asset Management. All rights reserved.
        </p>
      </div>
    `,
    // Optional: Attach the PDF directly to the email
    // attachments: [
    //   {
    //     filename: 'InvestmentForm.pdf',
    //     path: localPdfFilePath // Absolute path to the PDF on your server
    //   }
    // ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendFormPdfEmail };