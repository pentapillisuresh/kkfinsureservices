const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const investmentFormController = require('../controllers/investmentFormController');
const { validateInvestmentForm } = require('../middleware/validators/investmentFormValidator');

// ==========================================
// Public or Authenticated User Routes
// ==========================================
// Allow users (or anyone if public) to submit the form
router.post('/',validateInvestmentForm, investmentFormController.createForm);

// ==========================================
// Admin Only Routes
// ==========================================
router.use(authenticate, authorizeAdmin);

// Get all forms with search and pagination
router.get('/', investmentFormController.getAllForms);

// Get a specific form by ID
router.get('/:id', investmentFormController.getFormById);

// Update form details
router.put('/:id', investmentFormController.updateForm);

// Update only documents and DPC check status (useful for admin panel)
router.put('/:id/documents', investmentFormController.updateFormDocuments);

// Delete a form
router.delete('/:id', investmentFormController.deleteForm);

module.exports = router;