const Response = require("../classes/Response");
const db = require("../config/db.config");
const USER_CONSTANTS = require("../constants/userConstants");
const { recordActivity } = require("./activityController");

function userLabel(user) {
  if (!user) return null;
  const name = user.display_name || "";
  const email = user.email || "";
  return name && email ? `${name} (${email})` : email || name || null;
}

function normalizePatch(body) {
  const { id, ...rest } = body;
  const patch = {};
  if (rest.display_name !== undefined) patch.display_name = rest.display_name || null;
  if (rest.given_name !== undefined) patch.given_name = rest.given_name || null;
  if (rest.family_name !== undefined) patch.family_name = rest.family_name || null;
  if (rest.is_active !== undefined) patch.is_active = rest.is_active;
  if (rest.role !== undefined) patch.role = rest.role;
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
      role: ["admin", "hr-user", "user"].includes(req.body.role) ? req.body.role : "user",
      login_type: USER_CONSTANTS.LOGIN_TYPE.EMAIL,
    });

    recordActivity(req, {
      action: "user.create",
      entity_type: "user",
      entity_id: created.id,
      entity_label: userLabel(created),
      metadata: { role: created.role, is_active: created.is_active },
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
        "role",
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

    // Don't let the only admin demote themselves into a locked-out state.
    const jwtUserId = req.user?.user_id != null ? Number(req.user.user_id) : null;
    const isSelf = jwtUserId !== null && Number(existing.id) === jwtUserId;
    const demotingSelf =
      isSelf && patch.role !== undefined && patch.role !== "admin" && existing.role === "admin";
    if (demotingSelf) {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            "You cannot remove admin from your own account",
            400
          )
        );
    }

    await existing.update(patch);
    const updated = await db.user.findByPk(req.body.id);
    recordActivity(req, {
      action: "user.update",
      entity_type: "user",
      entity_id: req.body.id,
      entity_label: userLabel(updated),
      metadata: { changed_fields: Object.keys(patch) },
    });
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

    const existing = await db.user.findByPk(req.params.id);
    const removed = await db.user.destroy({ where: { id: req.params.id } });
    if (!removed) {
      return res.status(404).json(Response.sendResponse(false, null, USER_CONSTANTS.NOT_FOUND, 404));
    }
    recordActivity(req, {
      action: "user.delete",
      entity_type: "user",
      entity_id: req.params.id,
      entity_label: userLabel(existing),
    });
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
