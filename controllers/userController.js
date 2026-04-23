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

const createUser = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, USER_CONSTANTS.ERROR_OCCURED, 400));
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, USER_CONSTANTS.DUPLICATE_EMAIL, 400));
    }

    const created = await User.create({
      email,
      display_name: req.body.display_name ? String(req.body.display_name).trim() : null,
      given_name: req.body.given_name ? String(req.body.given_name).trim() : null,
      family_name: req.body.family_name ? String(req.body.family_name).trim() : null,
      is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
    });

    return res
      .status(201)
      .json(Response.sendResponse(true, created, USER_CONSTANTS.CREATED, 201));
  } catch (err) {
    if (err && err.code === "23505") {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, USER_CONSTANTS.DUPLICATE_EMAIL, 400));
    }
    console.error("createUser", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, USER_CONSTANTS.ERROR_OCCURED, 500));
  }
};

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
  createUser,
  getAllUsers,
  findUserById,
  updateUser,
  deleteUser,
};
