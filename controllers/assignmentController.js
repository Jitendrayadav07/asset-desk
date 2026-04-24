const Response = require("../classes/Response");
const db = require("../config/db.config");
const ASSIGNMENT_CONSTANTS = require("../constants/assignmentConstants");
const { recordActivity } = require("./activityController");

function assignmentLabel(assignment) {
  if (!assignment) return null;
  const asset = assignment.asset;
  const emp = assignment.employee;
  const assetBit = asset ? `${asset.serial_number ?? ""} · ${asset.name_model ?? ""}`.trim() : "";
  const empBit = emp?.name ?? "";
  if (assetBit && empBit) return `${assetBit} → ${empBit}`;
  return assetBit || empBit || null;
}

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

async function findStatusIdByName(name) {
  const row = await db.assetStatus.findOne({
    where: db.sequelize.where(
      db.sequelize.fn("LOWER", db.sequelize.col("name")),
      String(name).toLowerCase()
    ),
  });
  return row ? row.id : null;
}

// Asset types that physically get a hostname + asset id sticker. Only these
// require hostname/aid when assigning. Compared case-insensitively.
const HOSTNAME_AID_REQUIRED_TYPES = new Set(["laptop", "desktop"]);

function requiresHostnameAid(assetTypeName) {
  return HOSTNAME_AID_REQUIRED_TYPES.has(
    String(assetTypeName ?? "").trim().toLowerCase()
  );
}

const createAssignment = async (req, res) => {
  try {
    const { asset_id, employee_id, hostname, aid, note, assigned_by } = req.body;

    const asset = await db.asset.findByPk(asset_id, {
      include: [{ model: db.assetType, as: "assetType", attributes: ["id", "name"] }],
    });
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

    // Hostname / AID are only meaningful for computers. Enforce them for
    // Laptop / Desktop, accept empty for everything else.
    const mustHaveHostnameAid = requiresHostnameAid(asset.assetType?.name);
    const trimmedHostname = hostname != null ? String(hostname).trim() : "";
    const trimmedAid = aid != null ? String(aid).trim() : "";
    if (mustHaveHostnameAid && (!trimmedHostname || !trimmedAid)) {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            "Hostname and AID are required for Laptop and Desktop assignments",
            400
          )
        );
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

    const assignedStatusId = await findStatusIdByName("assigned");
    if (!assignedStatusId) {
      return res
        .status(500)
        .json(
          Response.sendResponse(
            false,
            null,
            "Required asset_status lookup row is missing. Seed asset_statuses first.",
            500
          )
        );
    }

    const created = await db.sequelize.transaction(async (t) => {
      const assignment = await db.assignment.create(
        {
          asset_id,
          employee_id,
          hostname: trimmedHostname,
          aid: trimmedAid,
          note: note ? String(note).trim() : null,
          assigned_by: assigned_by ? String(assigned_by).trim() : null,
        },
        { transaction: t }
      );
      // Flip the asset to `assigned`. `is_used` is a lifetime flag — once true,
      // stays true, so we set it here too (no-op for re-assignments).
      await db.asset.update(
        { asset_status_id: assignedStatusId, is_used: true },
        { where: { id: asset_id }, transaction: t }
      );
      return assignment;
    });

    const withRelations = await db.assignment.findByPk(created.id, {
      include: baseIncludes,
    });

    recordActivity(req, {
      action: "assignment.create",
      entity_type: "assignment",
      entity_id: created.id,
      entity_label: assignmentLabel(withRelations),
      metadata: {
        asset_id,
        employee_id,
        hostname: withRelations?.hostname ?? null,
        aid: withRelations?.aid ?? null,
      },
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
    const returnCondition = ["good", "maintenance", "retired", "missing"].includes(
      req.body.return_condition
    )
      ? req.body.return_condition
      : "good";

    // Map return condition → target asset_status name. Good returns to the
    // pool; others transition the asset into the matching lifecycle state so
    // the inventory badge + metadata stay correct without a second call.
    const targetStatusName =
      returnCondition === "good" ? "unassigned" : returnCondition;
    const targetStatusId = await findStatusIdByName(targetStatusName);
    if (!targetStatusId) {
      return res
        .status(500)
        .json(
          Response.sendResponse(
            false,
            null,
            "Required asset_status lookup row is missing. Seed asset_statuses first.",
            500
          )
        );
    }

    await db.sequelize.transaction(async (t) => {
      await db.assignment.update(
        {
          unassigned_at: new Date(),
          unassigned_reason: reason,
          unassigned_by: unassignedBy || null,
        },
        { where: { id: existing.id }, transaction: t }
      );

      // Only flip the asset if it is currently `assigned` — a retired/missing
      // asset that got auto-unassigned shouldn't be stamped over by a stale
      // unassign call.
      const currentAsset = await db.asset.findByPk(existing.asset_id, { transaction: t });
      const assignedStatusId = await findStatusIdByName("assigned");
      if (!currentAsset || currentAsset.asset_status_id !== assignedStatusId) {
        return;
      }

      const patch = { asset_status_id: targetStatusId };
      const now = new Date();
      if (returnCondition === "retired") {
        patch.retired_at = now;
        patch.retired_reason = reason;
        patch.retired_by = unassignedBy || null;
        patch.missing_since = null;
        patch.missing_reason = null;
        patch.last_known_location = null;
        patch.reported_by = null;
      } else if (returnCondition === "missing") {
        patch.missing_since = now;
        patch.missing_reason = reason;
        patch.last_known_location = currentAsset.location || null;
        patch.reported_by = unassignedBy || null;
        patch.retired_at = null;
        patch.retired_reason = null;
        patch.retired_by = null;
      } else if (returnCondition === "maintenance") {
        // Maintenance has no dedicated timestamp columns — the activity log
        // captures the "why"; the asset's status field captures the "what".
      } else {
        // "good" → back to unassigned; clear any stale lifecycle metadata.
        patch.retired_at = null;
        patch.retired_reason = null;
        patch.retired_by = null;
        patch.missing_since = null;
        patch.missing_reason = null;
        patch.last_known_location = null;
        patch.reported_by = null;
      }

      await db.asset.update(patch, {
        where: { id: existing.asset_id },
        transaction: t,
      });
    });

    const updated = await db.assignment.findByPk(existing.id, { include: baseIncludes });
    recordActivity(req, {
      action: "assignment.unassign",
      entity_type: "assignment",
      entity_id: existing.id,
      entity_label: assignmentLabel(updated),
      metadata: {
        reason,
        unassigned_by: unassignedBy,
        return_condition: returnCondition,
        resulting_status: targetStatusName,
        asset_id: existing.asset_id,
        employee_id: existing.employee_id,
      },
    });
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
