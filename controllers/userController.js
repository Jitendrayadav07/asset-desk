const Response = require("../classes/Response");
const User = require("../models/User");
const USER_CONSTANTS = require("../constants/userConstants");

function normalizePatch(body) {
  const { id, ...rest } = body;
  const patch = {};
  if (rest.display_name !== undefined) patch.display_name = rest.display_name || null;
  if (rest.given_name !== undefined) patch.given_name = rest.given_name || null;
  if (rest.family_name !== undefined) patch.family_name = rest.family_name || null;
  if (rest.is_active !== undefined) patch.is_active = rest.is_active;
  return patch;
}

const getAllUsers = async (req, res) => {
  try {
    const rows = await User.findAll();
    return res.status(200).json(Response.sendResponse(true, rows, null, 200));
  } catch (err) {
    console.error("getAllUsers", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, USER_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const findUserById = async (req, res) => {
  try {
    const row = await User.findById(req.params.id);
    if (!row) {
      return res.status(404).json(Response.sendResponse(false, null, USER_CONSTANTS.NOT_FOUND, 404));
    }
    return res.status(200).json(Response.sendResponse(true, row, null, 200));
  } catch (err) {
    console.error("findUserById", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, USER_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const updateUser = async (req, res) => {
  try {
    const patch = normalizePatch(req.body);
    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, USER_CONSTANTS.NOTHING_TO_UPDATE, 400));
    }

    const existing = await User.findById(req.body.id);
    if (!existing) {
      return res.status(404).json(Response.sendResponse(false, null, USER_CONSTANTS.NOT_FOUND, 404));
    }

    const updated = await User.update(req.body.id, patch);
    return res.status(200).json(Response.sendResponse(true, updated, USER_CONSTANTS.UPDATED, 200));
  } catch (err) {
    console.error("updateUser", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, USER_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const deleteUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const jwtUserId = req.user?.user_id != null ? Number(req.user.user_id) : null;
    if (jwtUserId !== null && targetId === jwtUserId) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, USER_CONSTANTS.CANNOT_REMOVE_SELF, 400));
    }

    const removed = await User.remove(req.params.id);
    if (!removed) {
      return res.status(404).json(Response.sendResponse(false, null, USER_CONSTANTS.NOT_FOUND, 404));
    }
    return res.status(200).json(Response.sendResponse(true, removed, USER_CONSTANTS.DELETED, 200));
  } catch (err) {
    console.error("deleteUser", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, USER_CONSTANTS.ERROR_OCCURED, 500));
  }
};

module.exports = {
  getAllUsers,
  findUserById,
  updateUser,
  deleteUser,
};
