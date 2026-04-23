const Response = require("../classes/Response");
const db = require("../config/db.config");
const ASSIGNMENT_CONSTANTS = require("../constants/assignmentConstants");

const assetInclude = {
  model: db.asset,
  as: "asset",
  include: [
    { model: db.assetType, as: "assetType", attributes: ["id", "name"] },
    { model: db.assetStatus, as: "assetStatus", attributes: ["id", "name"] },
    { model: db.assetCondition, as: "assetCondition", attributes: ["id", "name"] },
  ],
};

const employeeInclude = {
  model: db.employee,
  as: "employee",
};

const baseIncludes = [assetInclude, employeeInclude];

const createAssignment = async (req, res) => {
  try {
    const { asset_id, employee_id, hostname, aid, note, assigned_by } = req.body;

    const asset = await db.asset.findByPk(asset_id);
    if (!asset) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.ASSET_NOT_FOUND, 404));
    }
    if (asset.retired_at) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.ASSET_RETIRED, 400));
    }
    if (asset.missing_since) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.ASSET_MISSING, 400));
    }

    const employee = await db.employee.findByPk(employee_id);
    if (!employee) {
      return res
        .status(404)
        .json(
          Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.EMPLOYEE_NOT_FOUND, 404)
        );
    }
    if (employee.left_at) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.EMPLOYEE_LEFT, 400));
    }

    const existingActive = await db.assignment.findOne({
      where: { asset_id, unassigned_at: null },
    });
    if (existingActive) {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            ASSIGNMENT_CONSTANTS.ASSET_ALREADY_ASSIGNED,
            400
          )
        );
    }

    const created = await db.assignment.create({
      asset_id,
      employee_id,
      hostname: String(hostname).trim(),
      aid: String(aid).trim(),
      note: note ? String(note).trim() : null,
      assigned_by: assigned_by ? String(assigned_by).trim() : null,
    });

    const withRelations = await db.assignment.findByPk(created.id, {
      include: baseIncludes,
    });

    return res
      .status(201)
      .json(
        Response.sendResponse(true, withRelations, ASSIGNMENT_CONSTANTS.CREATED, 201)
      );
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            ASSIGNMENT_CONSTANTS.ASSET_ALREADY_ASSIGNED,
            400
          )
        );
    }
    console.error("createAssignment", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const getAllAssignments = async (req, res) => {
  try {
    const { status = "all", asset_id, employee_id } = req.query;
    const where = {};
    if (status === "active") where.unassigned_at = null;
    else if (status === "returned") where.unassigned_at = { [db.Sequelize.Op.ne]: null };
    if (asset_id) where.asset_id = Number(asset_id);
    if (employee_id) where.employee_id = Number(employee_id);

    const rows = await db.assignment.findAll({
      where,
      include: baseIncludes,
      order: [["assigned_at", "DESC"]],
    });
    return res.status(200).json(Response.sendResponse(true, rows, null, 200));
  } catch (err) {
    console.error("getAllAssignments", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const findAssignmentById = async (req, res) => {
  try {
    const row = await db.assignment.findByPk(req.params.id, { include: baseIncludes });
    if (!row) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.NOT_FOUND, 404));
    }
    return res.status(200).json(Response.sendResponse(true, row, null, 200));
  } catch (err) {
    console.error("findAssignmentById", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const unassignAssignment = async (req, res) => {
  try {
    const existing = await db.assignment.findByPk(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.NOT_FOUND, 404));
    }
    if (existing.unassigned_at) {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            ASSIGNMENT_CONSTANTS.ALREADY_UNASSIGNED,
            400
          )
        );
    }

    const reason = String(req.body.reason || "").trim();
    const unassignedBy = req.body.unassigned_by
      ? String(req.body.unassigned_by).trim()
      : null;

    await db.assignment.update(
      {
        unassigned_at: new Date(),
        unassigned_reason: reason,
        unassigned_by: unassignedBy || null,
      },
      { where: { id: existing.id } }
    );

    const updated = await db.assignment.findByPk(existing.id, { include: baseIncludes });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, ASSIGNMENT_CONSTANTS.UNASSIGNED, 200));
  } catch (err) {
    console.error("unassignAssignment", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSIGNMENT_CONSTANTS.ERROR_OCCURED, 500));
  }
};

module.exports = {
  createAssignment,
  getAllAssignments,
  findAssignmentById,
  unassignAssignment,
};
