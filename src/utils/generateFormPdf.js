const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateFormPdf = (formData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // --- Header ---
      doc.fontSize(20).font('Helvetica-Bold').text('KK FINSURE', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('KK Finsure Asset Management', { align: 'center' });
      doc.fontSize(10).text('Investment Form', { align: 'center' });
      doc.moveDown(1.5);

      // Helper function to draw blue section headers
      const drawSectionHeader = (title) => {
        doc.rect(30, doc.y, 535, 18).fill('#4A7BB7'); // Blue background
        doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(title, 35, doc.y + 4);
        doc.moveDown(1.5);
        doc.fillColor('black').font('Helvetica').fontSize(10);
      };

      // Helper to draw a line
      const drawLine = (y) => {
        doc.moveTo(30, y).lineTo(565, y).stroke('#CCCCCC');
      };

      // ==========================================
      // INVESTOR DETAILS
      // ==========================================
      drawSectionHeader('INVESTOR DETAILS');
      
      doc.text(`NAME: ${formData.investorName || ''}`, 35);
      doc.text(`AGE: ${formData.age || ''} YEARS`, 300, doc.y - 12);
      doc.text(`EMAIL ID (INVESTOR): ${formData.investorEmail || ''}`, 35);
      doc.text(`ADDRESS: ${formData.investorAddress || ''}`, 35);
      doc.text(`DIST: ${formData.district || ''}`, 300, doc.y - 12);
      doc.text(`STATE: ${formData.state || ''}`, 35);
      doc.text(`PIN CODE: ${formData.pincode || ''}`, 300, doc.y - 12);
      doc.moveDown(1);
      drawLine(doc.y);
      doc.moveDown(1);

      // ==========================================
      // BANK DETAILS
      // ==========================================
      drawSectionHeader('BANK DETAILS (PAYOUT)');

      doc.text(`BANK & BRANCH NAME: ${formData.bankNameBranch || ''}`, 35);
      doc.text(`ACCOUNT NO: ${formData.accountNumber || ''}`, 35);
      doc.text(`IFSC CODE: ${formData.ifscCode || ''}`, 300, doc.y - 12);
      doc.text(`MOBILE NO: ${formData.investorMobile || ''}`, 35);
      doc.text(`PAN CARD NO: ${formData.panCardNo || ''}`, 300, doc.y - 12);
      doc.text(`AADHAR NO: ${formData.investorAadhar || ''}`, 35);
      doc.moveDown(1);
      drawLine(doc.y);
      doc.moveDown(1);

      // ==========================================
      // NOMINEE DETAILS
      // ==========================================
      drawSectionHeader('NOMINEE DETAILS');

      doc.text(`NOMINEE: ${formData.nomineeName || ''}`, 35);
      doc.text(`RELATIONSHIP: ${formData.nomineeRelationship || ''}`, 300, doc.y - 12);
      doc.text(`AADHAR NO: ${formData.nomineeAadhar || ''}`, 35);
      doc.text(`PHONE: ${formData.nomineePhone || ''}`, 300, doc.y - 12);
      doc.text(`EMAIL ID: ${formData.nomineeEmail || ''}`, 35);
      doc.text(`ADDRESS: ${formData.nomineeAddress || ''}`, 35);
      doc.moveDown(1);
      drawLine(doc.y);
      doc.moveDown(1);

      // ==========================================
      // INVESTMENT DETAILS
      // ==========================================
      drawSectionHeader('INVESTMENT DETAILS');

      doc.text(`INTRODUCER: ${formData.introducerName || ''}`, 35);
      doc.text(`INVESTED BY: ${formData.investedBy || ''}`, 35);
      doc.text(`DATE: ${formData.investmentDate || ''}`, 35);
      doc.text(`AMOUNT (Rs): ${formData.amount || ''}`, 300, doc.y - 12);
      doc.text(`PAID BY: ${formData.paymentMode || ''}`, 35);
      doc.text(`CHEQUE / TRANSFER DETAILS: ${formData.chequeTransferDetails || ''}`, 35);
      
      doc.moveDown(2);
      drawLine(doc.y);
      doc.moveDown(1.5);

      // ==========================================
      // SIGNATURES
      // ==========================================
      doc.text('_______________________', 35, doc.y);
      doc.text('SIGNATURE (INVESTOR)', 35, doc.y);
      
      doc.text('_______________________', 350, doc.y - 24);
      doc.text('SIGNATURE (KKFINSURE)', 350, doc.y - 12);
      
      doc.moveDown(2);

      // ==========================================
      // FOOTER
      // ==========================================
      doc.fontSize(8).text('Regulated under SEBI Guidelines', { align: 'center' });
      doc.text('Investments in securities market are subject to market risks. Please read all scheme related documents carefully before investing.', { align: 'center' });
      doc.moveDown(2);
      
      // Bajaj Finserv Logo Text (placeholder)
      doc.fontSize(12).font('Helvetica-Bold').text('BAJAJ FINSERV', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('BAJAJ FINANCIAL SECURITIES LIMITED', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateFormPdf;