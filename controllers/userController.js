const Response = require("../classes/Response");
const db = require("../config/db.config");
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

    const existing = await db.user.findOne({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, USER_CONSTANTS.DUPLICATE_EMAIL, 400));
    }

    const created = await db.user.create({
      email,
      display_name: req.body.display_name ? String(req.body.display_name).trim() : null,
      given_name: req.body.given_name ? String(req.body.given_name).trim() : null,
      family_name: req.body.family_name ? String(req.body.family_name).trim() : null,
      is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
      login_type: USER_CONSTANTS.LOGIN_TYPE.EMAIL,
    });

    return res
      .status(201)
      .json(Response.sendResponse(true, created, USER_CONSTANTS.CREATED, 201));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
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
    const rows = await db.user.findAll({
      attributes: [
        "id",
        "email",
        "display_name",
        "given_name",
        "family_name",
        "microsoft_id",
        "login_type",
        "is_active",
        "last_login",
        "created_at",
        "updated_at",
      ],
      order: [["created_at", "DESC"]],
    });
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
    const row = await db.user.findByPk(req.params.id);
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

    const existing = await db.user.findByPk(req.body.id);
    if (!existing) {
      return res.status(404).json(Response.sendResponse(false, null, USER_CONSTANTS.NOT_FOUND, 404));
    }

    await existing.update(patch);
    const updated = await db.user.findByPk(req.body.id);
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

    const removed = await db.user.destroy({ where: { id: req.params.id } });
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
