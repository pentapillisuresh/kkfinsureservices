const {Nominee} = require('../models');
const {User} = require('../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

/**
 * Create a new nominee (admin only)
 */
const createNominee = async (req, res) => {
  try {
    const { userId, fullName, relation, phone, email, address, documentPath } = req.body;

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Create nominee
    const nominee = await Nominee.create({
      fullName,
      relation,
      phone,
      email,
      address,
      documentPath
    });

    // Update user's nomineeId
    user.nomineeId = nominee.id;
    await user.save();

    return successResponse(res, { nominee, user: { id: user.id, nomineeId: user.nomineeId } }, 'Nominee created and linked to user successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all nominees (admin only)
 */
const getAllNominees = async (req, res) => {
  try {
    const nominees = await Nominee.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, nominees, 'Nominees fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get nominee by ID (admin only)
 */
const getNomineeById = async (req, res) => {
  try {
    const { id } = req.params;
    const nominee = await Nominee.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }]
    });

    if (!nominee) {
      return errorResponse(res, 'Nominee not found', 404);
    }

    return successResponse(res, nominee, 'Nominee fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update nominee (admin only)
 */
const updateNominee = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, relation, phone, email, address, documentPath } = req.body;

    const nominee = await Nominee.findByPk(id);
    if (!nominee) {
      return errorResponse(res, 'Nominee not found', 404);
    }

    await nominee.update({
      fullName: fullName || nominee.fullName,
      relation: relation || nominee.relation,
      phone: phone || nominee.phone,
      email: email || nominee.email,
      address: address || nominee.address,
      documentPath: documentPath || nominee.documentPath
    });

    return successResponse(res, nominee, 'Nominee updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete nominee (admin only)
 */
const deleteNominee = async (req, res) => {
  try {
    const { id } = req.params;
    const nominee = await Nominee.findByPk(id);
    if (!nominee) {
      return errorResponse(res, 'Nominee not found', 404);
    }

    // Check if any user is linked to this nominee
    const user = await User.findOne({ where: { nomineeId: id } });
    if (user) {
      return errorResponse(res, 'Cannot delete nominee as it is linked to a user. Remove association first.', 400);
    }

    await nominee.destroy();
    return successResponse(res, null, 'Nominee deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get authenticated user's nominee
 */
const getMyNominee = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Nominee, as: 'nominee' }]
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (!user.nominee) {
      return errorResponse(res, 'No nominee linked to your account', 404);
    }

    return successResponse(res, user.nominee, 'Nominee details fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Link nominee to user (admin only)
 */
const linkNomineeToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { nomineeId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const nominee = await Nominee.findByPk(nomineeId);
    if (!nominee) {
      return errorResponse(res, 'Nominee not found', 404);
    }

    user.nomineeId = nomineeId;
    await user.save();

    return successResponse(res, { userId, nomineeId }, 'Nominee linked to user successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createNominee,
  getAllNominees,
  getNomineeById,
  updateNominee,
  deleteNominee,
  getMyNominee,
  linkNomineeToUser
};