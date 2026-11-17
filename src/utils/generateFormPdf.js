const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateFormPdf = (formData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
      });

      const writeStream = fs.createWriteStream(outputPath);

      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', reject);
      doc.on('error', reject);

      doc.pipe(writeStream);

      const C = {
        navy: '#163858',
        blue: '#32648E',
        text: '#253447',
        muted: '#6E7C8D',
        border: '#DCE4ED',
        soft: '#F1F5F9',
        white: '#FFFFFF',
      };

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      const margin = 30;
      const contentWidth = pageWidth - margin * 2;

      const text = (value) => {
        return value === undefined || value === null
          ? ''
          : String(value);
      };

      const drawLine = (x1, y, x2) => {
        doc
          .save()
          .lineWidth(0.6)
          .strokeColor(C.border)
          .moveTo(x1, y)
          .lineTo(x2, y)
          .stroke()
          .restore();
      };

      // ==========================================
      // HEADER
      // ==========================================

      const logoPath = path.join(
        __dirname,
        '../../uploads/images/logo3.jpeg'
      );

      const logoWidth = 165;
      const logoHeight = 48;
      const logoY = 25;

      doc.image(
        logoPath,
        (pageWidth - logoWidth) / 2,
        logoY,
        {
          fit: [logoWidth, logoHeight],
          align: 'center',
          valign: 'center',
        }
      );

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(C.muted)
        .text(
          'KK Finsure Asset Management',
          margin,
          82,
          {
            width: contentWidth,
            align: 'center',
            lineBreak: false,
          }
        );

      doc
        .save()
        .roundedRect(
          margin,
          103,
          contentWidth,
          26,
          4
        )
        .fill(C.navy)
        .restore();

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(C.white)
        .text(
          'INVESTMENT FORM',
          margin,
          111,
          {
            width: contentWidth,
            align: 'center',
            characterSpacing: 1,
            lineBreak: false,
          }
        );

      // ==========================================
      // SECTION DATA
      // ==========================================

      const sections = [
        {
          title: 'INVESTOR DETAILS',
          rows: [
            [
              {
                label: 'NAME',
                value: formData.investorName,
              },
              {
                label: 'AGE',
                value:
                  formData.age !== undefined &&
                  formData.age !== null &&
                  formData.age !== ''
                    ? `${formData.age} YEARS`
                    : '',
              },
            ],
            [
              {
                label: 'EMAIL ID (INVESTOR)',
                value: formData.investorEmail,
              },
            ],
            [
              {
                label: 'ADDRESS',
                value: formData.investorAddress,
              },
            ],
            [
              {
                label: 'DISTRICT',
                value: formData.district,
              },
              {
                label: 'STATE',
                value: formData.state,
              },
              {
                label: 'PIN CODE',
                value: formData.pincode,
              },
            ],
          ],
        },
        {
          title: 'BANK DETAILS (PAYOUT)',
          rows: [
            [
              {
                label: 'BANK & BRANCH NAME',
                value: formData.bankNameBranch,
              },
            ],
            [
              {
                label: 'ACCOUNT NO',
                value: formData.accountNumber,
              },
              {
                label: 'IFSC CODE',
                value: formData.ifscCode,
              },
            ],
            [
              {
                label: 'MOBILE NO',
                value: formData.investorMobile,
              },
              {
                label: 'PAN CARD NO',
                value: formData.panCardNo,
              },
              {
                label: 'AADHAR NO',
                value: formData.investorAadhar,
              },
            ],
          ],
        },
        {
          title: 'NOMINEE DETAILS',
          rows: [
            [
              {
                label: 'NOMINEE',
                value: formData.nomineeName,
              },
              {
                label: 'RELATIONSHIP',
                value: formData.nomineeRelationship,
              },
            ],
            [
              {
                label: 'AADHAR NO',
                value: formData.nomineeAadhar,
              },
              {
                label: 'PHONE',
                value: formData.nomineePhone,
              },
            ],
            [
              {
                label: 'EMAIL ID',
                value: formData.nomineeEmail,
              },
            ],
            [
              {
                label: 'ADDRESS',
                value: formData.nomineeAddress,
              },
            ],
          ],
        },
        {
          title: 'INVESTMENT DETAILS',
          rows: [
            [
              {
                label: 'INTRODUCER',
                value: formData.introducerName,
              },
              {
                label: 'INVESTED BY',
                value: formData.investedBy,
              },
            ],
            [
              {
                label: 'DATE',
                value: formData.investmentDate,
              },
              {
                label: 'AMOUNT (Rs)',
                value: formData.amount,
              },
              {
                label: 'PAID BY',
                value: formData.paymentMode,
              },
            ],
            [
              {
                label: 'CHEQUE / TRANSFER DETAILS',
                value: formData.chequeTransferDetails,
              },
            ],
          ],
        },
      ];

      // ==========================================
      // COMPACT FIELD LAYOUT
      // ==========================================

      const padding = 10;
      const columnGap = 14;

      const getFieldWidth = (count) => {
        return (
          (contentWidth -
            padding * 2 -
            columnGap * (count - 1)) /
          count
        );
      };

      const getRowHeight = (row) => {
        const width = getFieldWidth(row.length);

        doc.font('Helvetica').fontSize(8.5);

        const valueHeight = Math.max(
          ...row.map((field) =>
            doc.heightOfString(
              text(field.value) || ' ',
              {
                width,
                lineGap: 1,
              }
            )
          )
        );

        return Math.max(27, 11 + valueHeight + 6);
      };

      const sectionHeaderHeight = 21;
      const sectionHeaderGap = 6;
      const sectionGap = 8;

      const getSectionHeight = (section) => {
        return (
          sectionHeaderHeight +
          sectionHeaderGap +
          section.rows.reduce(
            (total, row) => total + getRowHeight(row),
            0
          ) +
          sectionGap
        );
      };

      const naturalBodyHeight = sections.reduce(
        (total, section) =>
          total + getSectionHeight(section),
        0
      );

      // Fit all detail sections within the single-page body.
      const bodyTop = 141;
      const bodyBottom = 650;
      const availableBodyHeight = bodyBottom - bodyTop;

      const bodyScale = Math.min(
        1,
        availableBodyHeight / naturalBodyHeight
      );

      let y = 0;

      doc.save();
      doc.translate(margin, bodyTop);
      doc.scale(bodyScale);

      // Keep the section width equal to the page content width.
      // Horizontal dimensions are compensated for the body scale.
      const bodyWidth = contentWidth / bodyScale;

      const bodyFieldWidth = (count) => {
        return (
          (bodyWidth -
            padding * 2 -
            columnGap * (count - 1)) /
          count
        );
      };

      sections.forEach((section) => {
        doc
          .save()
          .roundedRect(
            0,
            y,
            bodyWidth,
            sectionHeaderHeight,
            3
          )
          .fill(C.soft)
          .restore();

        doc
          .save()
          .rect(0, y + 4, 3, 13)
          .fill(C.blue)
          .restore();

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(C.navy)
          .text(
            section.title,
            padding,
            y + 6,
            {
              width: bodyWidth - padding * 2,
              lineBreak: false,
            }
          );

        y += sectionHeaderHeight + sectionHeaderGap;

        section.rows.forEach((row, rowIndex) => {
          // Use the original measured height to preserve
          // the single-page fit calculation.
          const rowHeight = getRowHeight(row);
          const width = bodyFieldWidth(row.length);

          row.forEach((field, fieldIndex) => {
            const x =
              padding +
              fieldIndex * (width + columnGap);

            doc
              .font('Helvetica-Bold')
              .fontSize(6.3)
              .fillColor(C.muted)
              .text(field.label, x, y, {
                width,
                lineBreak: false,
              });

            doc
              .font('Helvetica')
              .fontSize(8.5)
              .fillColor(C.text)
              .text(
                text(field.value),
                x,
                y + 10,
                {
                  width,
                  lineGap: 1,
                }
              );
          });

          y += rowHeight;

          if (rowIndex < section.rows.length - 1) {
            doc
              .save()
              .lineWidth(0.4)
              .strokeColor(C.border)
              .moveTo(padding, y - 4)
              .lineTo(bodyWidth - padding, y - 4)
              .stroke()
              .restore();
          }
        });

        y += sectionGap;
      });

      doc.restore();

      // ==========================================
      // SIGNATURES
      // ==========================================

      const signatureY = 660;
      const signatureHeight = 57;
      const signatureGap = 24;
      const signatureWidth =
        (contentWidth - signatureGap) / 2;

      const drawSignature = (x, label) => {
        doc
          .save()
          .roundedRect(
            x,
            signatureY,
            signatureWidth,
            signatureHeight,
            4
          )
          .lineWidth(0.6)
          .strokeColor(C.border)
          .stroke()
          .restore();

        drawLine(
          x + 14,
          signatureY + 34,
          x + signatureWidth - 14
        );

        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor(C.navy)
          .text(
            label,
            x + 10,
            signatureY + 42,
            {
              width: signatureWidth - 20,
              align: 'center',
              lineBreak: false,
            }
          );
      };

      drawSignature(
        margin,
        'SIGNATURE (INVESTOR)'
      );

      drawSignature(
        margin + signatureWidth + signatureGap,
        'SIGNATURE (KKFINSURE)'
      );

      // ==========================================
      // DISCLAIMER ABOVE BAJAJ FINSERV
      // ==========================================

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(C.navy)
        .text(
          'Regulated under SEBI Guidelines',
          margin,
          733,
          {
            width: contentWidth,
            align: 'center',
            lineBreak: false,
          }
        );

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C.muted)
        .text(
          'Investments in securities market are subject to market risks. Please read all scheme related documents carefully before investing.',
          margin + 12,
          747,
          {
            width: contentWidth - 24,
            align: 'center',
            lineGap: 2,
          }
        );

      drawLine(
        margin,
        775,
        pageWidth - margin
      );

      // ==========================================
      // BAJAJ FINSERV — BOTTOM RIGHT
      // ==========================================

      const bajajWidth = 235;
      const bajajX =
        pageWidth - margin - bajajWidth;

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(C.navy)
        .text(
          'BAJAJ FINSERV',
          bajajX,
          786,
          {
            width: bajajWidth,
            align: 'right',
            lineBreak: false,
          }
        );

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor(C.muted)
        .text(
          'BAJAJ FINANCIAL SECURITIES LIMITED',
          bajajX,
          802,
          {
            width: bajajWidth,
            align: 'right',
            lineBreak: false,
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateFormPdf;