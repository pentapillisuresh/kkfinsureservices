const {Document} = require('../models');
const {User} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const fs = require('fs');
const path = require("path");

/**
 * Upload a document (admin only, but we have separate route for company docs)
 */
const uploadDocument = async (req, res) => {
  try {
    const { userId, type, title } = req.body;

    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }
    }
    const relativePath = req.file.path
    .split(`${path.sep}uploads${path.sep}`)[1]
    .replace(/\\/g, "/");

    const document = await Document.create({
      userId: userId || null,
      type: type || 'other',
      title,
      filePath: `uploads/${relativePath}`,
      uploadedBy: req.user.id
    });

    const fullUrl = `${process.env.BASE_URL}/${document.filePath}`;
      return successResponse(res, { ...document.toJSON(), filePath: fullUrl }, 'Document uploaded successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all documents (admin only)
 */
const getAllDocuments = async (req, res) => {
  try {
    const { type, userId } = req.query;
    const where = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const documents = await Document.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Add full URL
    const docsWithUrl = documents.map(doc => ({
      ...doc.toJSON(),
      filePath: `${process.env.BASE_URL}/${doc.filePath.replace(/\\/g, '/')}`
    }));

    return successResponse(res, docsWithUrl, 'Documents fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get document by ID (admin only)
 */
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    const fullUrl = `${process.env.BASE_URL}/${document.filePath.replace(/\\/g, '/')}`;
    return successResponse(res, { ...document.toJSON(), filePath: fullUrl }, 'Document fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get authenticated user's own documents
 */
const getMyDocuments = async (req, res) => {
  try {
    const { type } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;

    const documents = await Document.findAll({
      where,
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    const docsWithUrl = documents.map(doc => ({
      ...doc.toJSON(),
      filePath: `${process.env.BASE_URL}/${doc.filePath.replace(/\\/g, '/')}`
    }));

    return successResponse(res, docsWithUrl, 'Your documents fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all documents for a specific user (admin)
 */
const getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const documents = await Document.findAll({
      where: { userId },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    const docsWithUrl = documents.map(doc => ({
      ...doc.toJSON(),
      filePath: `${process.env.BASE_URL}/${doc.filePath.replace(/\\/g, '/')}`
    }));

    return successResponse(res, docsWithUrl, 'User documents fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update document metadata (admin only)
 */
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    await document.update({ title, type });
    return successResponse(res, document, 'Document updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete document (admin only)
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id);
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await document.destroy();
    return successResponse(res, null, 'Document deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  getMyDocuments,
  getUserDocuments,
  updateDocument,
  deleteDocument
};