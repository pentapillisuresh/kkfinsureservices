const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Upload a single file (handles image resize if image)
 */
const uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }
    let filePath = req.file.path;
    const isImage = req.file.mimetype.startsWith('image/');

    // If image, resize and replace original (optional)
    // if (isImage) {
    //   const resizedPath = path.join(
    //     path.dirname(filePath),
    //     `resized-${path.basename(filePath)}`
    //   );
    //   await sharp(filePath)
    //     .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    //     .toFile(resizedPath);
    //   // Replace original with resized
    //   fs.unlinkSync(filePath);
    //   filePath = resizedPath;
    // }

    const relativePath = req.file.path
    .split(`${path.sep}uploads${path.sep}`)[1]
    .replace(/\\/g, "/");
    
    const fullUrl = `uploads/${relativePath}`;
    return successResponse(res, {
      filePath: fullUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    }, 'File uploaded successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Upload multiple files (handles image resize for each)
 */
const uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 'No files uploaded', 400);
    }

    const uploadedFiles = [];
    for (const file of req.files) {
      let filePath = file.path;
      const isImage = file.mimetype.startsWith('image/');

      if (isImage) {
        const resizedPath = path.join(
          path.dirname(filePath),
          `resized-${path.basename(filePath)}`
        );
        await sharp(filePath)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .toFile(resizedPath);
        fs.unlinkSync(filePath);
        filePath = resizedPath;
      }

      const fullUrl = `${process.env.BASE_URL}/${filePath.replace(/\\/g, '/')}`;
      uploadedFiles.push({
        filePath: fullUrl,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
    }

    return successResponse(res, { files: uploadedFiles }, 'Files uploaded successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Download a file (with authentication)
 */
const downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
    // Security: ensure file is within uploads directory
    const safePath = path.join(__dirname, '../../uploads', filename);
    const resolvedPath = path.resolve(safePath);
    const uploadsDir = path.resolve(path.join(__dirname, '../../uploads'));

    // Check if file is inside uploads directory
    if (!resolvedPath.startsWith(uploadsDir)) {
      return errorResponse(res, 'Invalid file path', 403);
    }

    if (!fs.existsSync(resolvedPath)) {
      return errorResponse(res, 'File not found', 404);
    }

    res.sendFile(resolvedPath);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  downloadFile
};