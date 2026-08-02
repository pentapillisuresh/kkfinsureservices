const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authenticate, authorizeAdmin);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/status', adminController.toggleUserStatus);

// Dashboard / stats
router.get('/dashboard/stats', adminController.getDashboardStats);

// DPC check
router.put('/investments/:id/dpc', adminController.approveDPC);

// Company documents
router.post('/company-documents', adminController.uploadCompanyDocument);
router.get('/company-documents', adminController.getCompanyDocuments);
router.delete('/company-documents/:id', adminController.deleteCompanyDocument);

// Generate balance sheet for a user
router.post('/balance-sheet/generate', adminController.generateBalanceSheet);

// Additional admin-only routes (if needed)
router.get('/logs', adminController.getAuditLogs);

module.exports = router;