const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const nomineeController = require('../controllers/nomineeController');

// User views own nominee
router.get('/my', authenticate, nomineeController.getMyNominee);

// Admin CRUD for nominees
router.post('/', authenticate, authorizeAdmin, nomineeController.createNominee);
router.get('/', authenticate, authorizeAdmin, nomineeController.getAllNominees);
router.get('/:id', authenticate, authorizeAdmin, nomineeController.getNomineeById);
router.put('/:id', authenticate, authorizeAdmin, nomineeController.updateNominee);
router.delete('/:id', authenticate, authorizeAdmin, nomineeController.deleteNominee);

// Admin can also link nominee to user (optional)
router.put('/user/:userId/nominee', authenticate, authorizeAdmin, nomineeController.linkNomineeToUser);

module.exports = router;