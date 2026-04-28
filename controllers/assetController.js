const { Op } = require("sequelize");
const Response = require("../classes/Response");
const db = require("../config/db.config");
const ASSET_CONSTANTS = require("../constants/assetConstants");
const { recordActivity } = require("./activityController");
const {
  readUploadedExcelBuffer,
  parseWorkbookRows,
  buildTemplateBuffer,
  sendXlsxDownload,
  str,
  dateYMD,
  num,
} = require("./importHelpers");

function assetLabel(asset) {
  if (!asset) return null;
  const name = asset.name_model || "";
  const serial = asset.serial_number || "";
  return serial && name ? `${serial} · ${name}` : serial || name || null;
}

const includeLookups = [
  { model: db.assetType, as: "assetType", attributes: ["id", "name"] },
  { model: db.assetStatus, as: "assetStatus", attributes: ["id", "name"] },
  { model: db.assetCondition, as: "assetCondition", attributes: ["id", "name"] },
];

/** Primary sort for asset lists: status name order (not id / not A–Z). */
function assetStatusOrderExpr(mainTableAlias) {
  return `CASE (SELECT s.name FROM asset_statuses s WHERE s.id = ${mainTableAlias}.asset_status_id)
    WHEN 'unassigned' THEN 1
    WHEN 'assigned' THEN 2
    WHEN 'maintenance' THEN 3
    WHEN 'retired' THEN 4
    WHEN 'missing' THEN 5
    ELSE 99
  END`;
}

function normalizePurchaseDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizePrice(value) {
  if (value == null || value === "") return null;
  return value;
}

async function validateLookupIds({ asset_type_id, asset_status_id, asset_condition_id }) {
  const type = await db.assetType.findByPk(asset_type_id);
  if (!type) {
    return { ok: false, message: ASSET_CONSTANTS.INVALID_TYPE_ID };
  }
  if (asset_status_id != null) {
    const s = await db.assetStatus.findByPk(asset_status_id);
    if (!s) return { ok: false, message: ASSET_CONSTANTS.INVALID_STATUS_ID };
  }
  if (asset_condition_id != null) {
    const c = await db.assetCondition.findByPk(asset_condition_id);
    if (!c) return { ok: false, message: ASSET_CONSTANTS.INVALID_CONDITION_ID };
  }
  return { ok: true };
}

function normalizeNullableFk(value) {
  if (value === "" || value === undefined) return null;
  return value;
}

function normalizeAssetTypeNameQuery(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).trim();
}

const createAsset = async (req, res) => {
  try {
    const body = { ...req.body };
    body.asset_status_id = normalizeNullableFk(body.asset_status_id);
    body.asset_condition_id = normalizeNullableFk(body.asset_condition_id);
    body.purchase_date = normalizePurchaseDate(body.purchase_date);
    body.warranty_date = normalizePurchaseDate(body.warranty_date);
    body.price_usd = normalizePrice(body.price_usd);
    body.model_number = body.model_number === "" ? null : body.model_number;
    body.configuration_specs =
      body.configuration_specs === "" ? null : body.configuration_specs;

    // New assets default to the `unassigned` lookup row so the status column
    // is never empty and flows like "Assign" have a well-defined origin state.
    if (body.asset_status_id == null) {
      body.asset_status_id = await findStatusIdByName("unassigned");
      if (!body.asset_status_id) {
        return res
          .status(500)
          .json(
            Response.sendResponse(false, null, ASSET_CONSTANTS.STATUS_LOOKUP_MISSING, 500)
          );
      }
    }
    // `is_used` is a lifetime flag — always starts false on create, regardless
    // of what the client sends.
    body.is_used = false;

    const lookup = await validateLookupIds({
      asset_type_id: body.asset_type_id,
      asset_status_id: body.asset_status_id,
      asset_condition_id: body.asset_condition_id,
    });
    if (!lookup.ok) {
      return res.status(400).json(Response.sendResponse(false, null, lookup.message, 400));
    }

    const created = await db.asset.create(body);
    const withLookups = await db.asset.findByPk(created.id, { include: includeLookups });
    recordActivity(req, {
      action: "asset.create",
      entity_type: "asset",
      entity_id: created.id,
      entity_label: assetLabel(withLookups),
      metadata: {
        asset_type: withLookups?.assetType?.name ?? null,
        location: withLookups?.location ?? null,
      },
    });
    return res
      .status(201)
      .json(Response.sendResponse(true, withLookups, ASSET_CONSTANTS.CREATED, 201));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.SERIAL_EXISTS, 400));
    }
    console.error("createAsset", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const getAllAssets = async (req, res) => {
  try {
    const where = {};
    const typeName = normalizeAssetTypeNameQuery(req.query.asset_type);
    if (typeName) {
      const assetTypeRow = await db.assetType.findOne({
        where: db.sequelize.where(
          db.sequelize.fn("LOWER", db.sequelize.col("name")),
          typeName.toLowerCase()
        ),
      });
      if (!assetTypeRow) {
        return res.status(200).json(Response.sendResponse(true, [], null, 200));
      }
      where.asset_type_id = assetTypeRow.id;
    }

    const mainAlias = `"${db.asset.name}"`;
    const rows = await db.asset.findAll({
      where,
      include: includeLookups,
      order: [
        [db.sequelize.literal(`${assetStatusOrderExpr(mainAlias)} ASC`)],
        [db.sequelize.literal(`${mainAlias}."purchase_date" DESC NULLS LAST`)],
        [db.sequelize.literal(`${mainAlias}."created_at" DESC`)],
      ],
    });
    return res.status(200).json(Response.sendResponse(true, rows, null, 200));
  } catch (err) {
    console.error("getAllAssets", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const findAssetById = async (req, res) => {
  try {
    const row = await db.asset.findOne({
      where: { id: req.params.id },
      include: includeLookups,
    });
    return res.status(200).json(Response.sendResponse(true, row, null, 200));
  } catch (err) {
    console.error("findAssetById", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const updateAsset = async (req, res) => {
  try {
    const { id, ...rest } = req.body;
    if (rest.asset_status_id !== undefined) {
      rest.asset_status_id = normalizeNullableFk(rest.asset_status_id);
    }
    if (rest.asset_condition_id !== undefined) {
      rest.asset_condition_id = normalizeNullableFk(rest.asset_condition_id);
    }
    if (rest.purchase_date !== undefined) {
      rest.purchase_date = normalizePurchaseDate(rest.purchase_date);
    }
    if (rest.warranty_date !== undefined) {
      rest.warranty_date = normalizePurchaseDate(rest.warranty_date);
    }
    if (rest.price_usd !== undefined) {
      rest.price_usd = normalizePrice(rest.price_usd);
    }
    if (rest.model_number === "") rest.model_number = null;
    if (rest.configuration_specs === "") rest.configuration_specs = null;

    const existing = await db.asset.findByPk(id);
    if (!existing) {
      return res.status(404).json(Response.sendResponse(false, null, ASSET_CONSTANTS.NOT_FOUND, 404));
    }

    if (
      rest.asset_type_id != null ||
      rest.asset_status_id !== undefined ||
      rest.asset_condition_id !== undefined
    ) {
      const lookup = await validateLookupIds({
        asset_type_id: rest.asset_type_id ?? existing.asset_type_id,
        asset_status_id:
          rest.asset_status_id !== undefined ? rest.asset_status_id : existing.asset_status_id,
        asset_condition_id:
          rest.asset_condition_id !== undefined
            ? rest.asset_condition_id
            : existing.asset_condition_id,
      });
      if (!lookup.ok) {
        return res.status(400).json(Response.sendResponse(false, null, lookup.message, 400));
      }
    }

    if (rest.serial_number && rest.serial_number !== existing.serial_number) {
      const dup = await db.asset.findOne({
        where: { serial_number: rest.serial_number, id: { [Op.ne]: id } },
      });
      if (dup) {
        return res
          .status(400)
          .json(Response.sendResponse(false, null, ASSET_CONSTANTS.SERIAL_EXISTS, 400));
      }
    }

    await db.asset.update(rest, { where: { id } });
    const updated = await db.asset.findByPk(id, { include: includeLookups });
    recordActivity(req, {
      action: "asset.update",
      entity_type: "asset",
      entity_id: id,
      entity_label: assetLabel(updated),
      metadata: { changed_fields: Object.keys(rest) },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, ASSET_CONSTANTS.UPDATED, 200));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.SERIAL_EXISTS, 400));
    }
    console.error("updateAsset", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const deleteAsset = async (req, res) => {
  try {
    const existing = await db.asset.findByPk(req.params.id);
    const destroyed = await db.asset.destroy({ where: { id: req.params.id } });
    if (!destroyed) {
      return res.status(404).json(Response.sendResponse(false, null, ASSET_CONSTANTS.NOT_FOUND, 404));
    }
    recordActivity(req, {
      action: "asset.delete",
      entity_type: "asset",
      entity_id: req.params.id,
      entity_label: assetLabel(existing),
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, destroyed, ASSET_CONSTANTS.DELETED, 200));
  } catch (err) {
    console.error("deleteAsset", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

async function findStatusIdByName(name) {
  const row = await db.assetStatus.findOne({
    where: db.sequelize.where(
      db.sequelize.fn("LOWER", db.sequelize.col("name")),
      String(name).toLowerCase()
    ),
  });
  return row ? row.id : null;
}

// Closes any active assignment (unassigned_at IS NULL) for the given asset.
// Returns the freshly-closed assignment record (with its employee joined) or
// null if there was nothing to close. Must run inside a transaction.
async function closeActiveAssignmentForAsset(assetId, { reason, unassignedBy }, t) {
  const active = await db.assignment.findOne({
    where: { asset_id: assetId, unassigned_at: null },
    transaction: t,
  });
  if (!active) return null;
  await db.assignment.update(
    {
      unassigned_at: new Date(),
      unassigned_reason: reason,
      unassigned_by: unassignedBy || null,
    },
    { where: { id: active.id }, transaction: t }
  );
  return db.assignment.findByPk(active.id, {
    include: [{ model: db.employee, as: "employee" }],
    transaction: t,
  });
}

const retireAsset = async (req, res) => {
  try {
    const existing = await db.asset.findByPk(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.NOT_FOUND, 404));
    }
    if (existing.retired_at) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ALREADY_RETIRED, 400));
    }

    const retiredStatusId = await findStatusIdByName("retired");
    if (!retiredStatusId) {
      return res
        .status(500)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.STATUS_LOOKUP_MISSING, 500));
    }

    const reason = String(req.body.reason || "").trim();
    const retiredBy = req.body.retired_by
      ? String(req.body.retired_by).trim()
      : null;

    const { updated, closedAssignment } = await db.sequelize.transaction(async (t) => {
      const closedAssignment = await closeActiveAssignmentForAsset(
        existing.id,
        {
          reason: `Asset marked as end-of-life: ${reason}`,
          unassignedBy: retiredBy,
        },
        t
      );

      await db.asset.update(
        {
          asset_status_id: retiredStatusId,
          retired_at: new Date(),
          retired_reason: reason,
          retired_by: retiredBy || null,
          missing_since: null,
          missing_reason: null,
          last_known_location: null,
          reported_by: null,
        },
        { where: { id: existing.id }, transaction: t }
      );

      const updated = await db.asset.findByPk(existing.id, {
        include: includeLookups,
        transaction: t,
      });
      return { updated, closedAssignment };
    });

    const payload = updated.toJSON();
    payload.closed_assignment = closedAssignment;
    recordActivity(req, {
      action: "asset.retire",
      entity_type: "asset",
      entity_id: existing.id,
      entity_label: assetLabel(updated),
      metadata: {
        reason,
        retired_by: retiredBy,
        closed_assignment_id: closedAssignment?.id ?? null,
        previous_owner: closedAssignment?.employee?.name ?? null,
      },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, payload, ASSET_CONSTANTS.RETIRED, 200));
  } catch (err) {
    console.error("retireAsset", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const reportMissingAsset = async (req, res) => {
  try {
    const existing = await db.asset.findByPk(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.NOT_FOUND, 404));
    }
    if (existing.missing_since) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ALREADY_MISSING, 400));
    }

    const missingStatusId = await findStatusIdByName("missing");
    if (!missingStatusId) {
      return res
        .status(500)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.STATUS_LOOKUP_MISSING, 500));
    }

    const reason = String(req.body.reason || "").trim();
    const lastKnown = req.body.last_known_location
      ? String(req.body.last_known_location).trim()
      : null;
    const reportedBy = req.body.reported_by
      ? String(req.body.reported_by).trim()
      : null;

    const { updated, closedAssignment } = await db.sequelize.transaction(async (t) => {
      const closedAssignment = await closeActiveAssignmentForAsset(
        existing.id,
        {
          reason: `Asset reported missing: ${reason}`,
          unassignedBy: reportedBy,
        },
        t
      );

      await db.asset.update(
        {
          asset_status_id: missingStatusId,
          missing_since: new Date(),
          missing_reason: reason,
          last_known_location: lastKnown || existing.location,
          reported_by: reportedBy || null,
          retired_at: null,
          retired_reason: null,
          retired_by: null,
        },
        { where: { id: existing.id }, transaction: t }
      );

      const updated = await db.asset.findByPk(existing.id, {
        include: includeLookups,
        transaction: t,
      });
      return { updated, closedAssignment };
    });

    const payload = updated.toJSON();
    payload.closed_assignment = closedAssignment;
    recordActivity(req, {
      action: "asset.report_missing",
      entity_type: "asset",
      entity_id: existing.id,
      entity_label: assetLabel(updated),
      metadata: {
        reason,
        last_known_location: lastKnown,
        reported_by: reportedBy,
        closed_assignment_id: closedAssignment?.id ?? null,
        previous_owner: closedAssignment?.employee?.name ?? null,
      },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, payload, ASSET_CONSTANTS.MISSING_REPORTED, 200));
  } catch (err) {
    console.error("reportMissingAsset", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const markMaintenanceAsset = async (req, res) => {
  try {
    const existing = await db.asset.findByPk(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.NOT_FOUND, 404));
    }
    if (existing.retired_at) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ALREADY_RETIRED, 400));
    }
    if (existing.missing_since) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ALREADY_MISSING, 400));
    }

    const maintenanceStatusId = await findStatusIdByName("maintenance");
    if (!maintenanceStatusId) {
      return res
        .status(500)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.STATUS_LOOKUP_MISSING, 500));
    }
    if (existing.asset_status_id === maintenanceStatusId) {
      return res
        .status(400)
        .json(
          Response.sendResponse(false, null, ASSET_CONSTANTS.ALREADY_MAINTENANCE, 400)
        );
    }

    const reason = String(req.body.reason || "").trim();
    const reportedBy = req.body.reported_by
      ? String(req.body.reported_by).trim()
      : null;

    const { updated, closedAssignment } = await db.sequelize.transaction(async (t) => {
      const closedAssignment = await closeActiveAssignmentForAsset(
        existing.id,
        {
          reason: `Sent to maintenance: ${reason}`,
          unassignedBy: reportedBy,
        },
        t
      );

      await db.asset.update(
        { asset_status_id: maintenanceStatusId },
        { where: { id: existing.id }, transaction: t }
      );

      const updated = await db.asset.findByPk(existing.id, {
        include: includeLookups,
        transaction: t,
      });
      return { updated, closedAssignment };
    });

    const payload = updated.toJSON();
    payload.closed_assignment = closedAssignment;
    recordActivity(req, {
      action: "asset.mark_maintenance",
      entity_type: "asset",
      entity_id: existing.id,
      entity_label: assetLabel(updated),
      metadata: {
        reason,
        reported_by: reportedBy,
        closed_assignment_id: closedAssignment?.id ?? null,
        previous_owner: closedAssignment?.employee?.name ?? null,
      },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, payload, ASSET_CONSTANTS.MAINTENANCE_SET, 200));
  } catch (err) {
    console.error("markMaintenanceAsset", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const restoreAsset = async (req, res) => {
  try {
    const existing = await db.asset.findByPk(req.params.id, { include: includeLookups });
    if (!existing) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.NOT_FOUND, 404));
    }

    const maintenanceStatusId = await findStatusIdByName("maintenance");
    const currentIsMaintenance =
      maintenanceStatusId != null && existing.asset_status_id === maintenanceStatusId;

    if (!existing.retired_at && !existing.missing_since && !currentIsMaintenance) {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            ASSET_CONSTANTS.NOT_RETIRED_MISSING_OR_MAINTENANCE,
            400
          )
        );
    }

    const unassignedStatusId = await findStatusIdByName("unassigned");
    if (!unassignedStatusId) {
      return res
        .status(500)
        .json(Response.sendResponse(false, null, ASSET_CONSTANTS.STATUS_LOOKUP_MISSING, 500));
    }

    await db.asset.update(
      {
        asset_status_id: unassignedStatusId,
        retired_at: null,
        retired_reason: null,
        retired_by: null,
        missing_since: null,
        missing_reason: null,
        last_known_location: null,
        reported_by: null,
      },
      { where: { id: existing.id } }
    );

    const updated = await db.asset.findByPk(existing.id, { include: includeLookups });
    recordActivity(req, {
      action: "asset.restore",
      entity_type: "asset",
      entity_id: existing.id,
      entity_label: assetLabel(updated),
      metadata: {
        restored_from: existing.retired_at
          ? "retired"
          : existing.missing_since
            ? "missing"
            : "maintenance",
      },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, ASSET_CONSTANTS.RESTORED, 200));
  } catch (err) {
    console.error("restoreAsset", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const ASSET_TEMPLATE_HEADERS = [
  "serial_number",
  "asset_type",
  "asset_status",
  "asset_condition",
  "name_model",
  "brand",
  "model_number",
  "configuration_specs",
  "location",
  "purchase_date",
  "warranty_date",
  "price_usd",
];

const downloadAssetTemplate = async (_req, res) => {
  try {
    const buffer = buildTemplateBuffer({
      headers: ASSET_TEMPLATE_HEADERS,
      examples: [
        [
          "SN-A100",
          "Laptop",
          "unassigned",
          "new",
          'MacBook Pro 14"',
          "Apple",
          "A2918",
          "M3 Pro / 18GB / 512GB",
          "Pune",
          "2024-03-10",
          "2027-03-10",
          2199,
        ],
        [
          "SN-M045",
          "Monitor",
          "unassigned",
          "refurbished",
          'Dell UltraSharp 27"',
          "Dell",
          "U2723QE",
          "27\" / 4K / IPS Black",
          "Mumbai",
          "2023-06-10",
          "",
          649,
        ],
      ],
      instructions: [
        "InventoryPro — Asset import template",
        "",
        "Required columns: serial_number, asset_type, name_model, brand, location.",
        "Optional: asset_status, asset_condition (Purchase Type), model_number,",
        "configuration_specs, purchase_date, warranty_date, price_usd.",
        "",
        "asset_type / asset_status / asset_condition must match existing lookup names",
        "(case-insensitive). New imports default to asset_status=unassigned. Valid values:",
        "  asset_type: Laptop / Desktop / Monitor / ...",
        "  asset_status: unassigned / maintenance / retired / missing",
        "  asset_condition (Purchase Type): new / refurbished",
        "",
        "purchase_date / warranty_date format: YYYY-MM-DD (e.g. 2024-03-10).",
        "warranty_date is optional — leave blank if not tracked.",
        "price_usd: plain number.",
        "serial_number must be unique across the inventory.",
      ],
    });
    return sendXlsxDownload(res, "asset_import_template.xlsx", buffer);
  } catch (err) {
    console.error("downloadAssetTemplate", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const importAssets = async (req, res) => {
  try {
    const upload = readUploadedExcelBuffer(req, "file");
    if (upload.error) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, upload.error, 400));
    }
    const buffer = upload.buffer;

    const rows = parseWorkbookRows(buffer);
    if (!rows.length) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, "Spreadsheet has no data rows.", 400));
    }

    // Pre-load lookup maps (name-lowercase → id) so we can resolve FKs per row
    // in one pass instead of N DB round-trips.
    const [types, statuses, conditions] = await Promise.all([
      db.assetType.findAll(),
      db.assetStatus.findAll(),
      db.assetCondition.findAll(),
    ]);
    const typeByName = new Map(types.map((t) => [t.name.toLowerCase(), t.id]));
    const statusByName = new Map(statuses.map((s) => [s.name.toLowerCase(), s.id]));
    const conditionByName = new Map(
      conditions.map((c) => [c.name.toLowerCase(), c.id])
    );
    const defaultStatusId = statusByName.get("unassigned") ?? null;

    const created = [];
    const errors = [];
    // Row numbering starts at 2 to account for header row.
    let rowIndex = 1;
    for (const raw of rows) {
      rowIndex += 1;
      try {
        const serial_number = str(raw.serial_number);
        const typeName = str(raw.asset_type);
        const statusName = str(raw.asset_status);
        const conditionName = str(raw.asset_condition);
        const name_model = str(raw.name_model);
        const brand = str(raw.brand);
        const model_number = str(raw.model_number);
        const configuration_specs = str(raw.configuration_specs);
        const location = str(raw.location);
        const purchase_date = dateYMD(raw.purchase_date);
        const warranty_date = dateYMD(raw.warranty_date);
        const price_usd = num(raw.price_usd);

        if (!serial_number) throw new Error("serial_number is required");
        if (!typeName) throw new Error("asset_type is required");
        if (!name_model) throw new Error("name_model is required");
        if (!brand) throw new Error("brand is required");
        if (!location) throw new Error("location is required");

        const asset_type_id = typeByName.get(typeName.toLowerCase());
        if (!asset_type_id) {
          throw new Error(`Unknown asset_type '${typeName}'`);
        }
        let asset_status_id = defaultStatusId;
        if (statusName) {
          asset_status_id = statusByName.get(statusName.toLowerCase()) ?? null;
          if (!asset_status_id) throw new Error(`Unknown asset_status '${statusName}'`);
        }
        let asset_condition_id = null;
        if (conditionName) {
          asset_condition_id = conditionByName.get(conditionName.toLowerCase()) ?? null;
          if (!asset_condition_id)
            throw new Error(`Unknown asset_condition '${conditionName}'`);
        }

        const row = await db.asset.create({
          serial_number,
          asset_type_id,
          asset_status_id,
          asset_condition_id,
          name_model,
          brand,
          model_number,
          configuration_specs,
          location,
          purchase_date,
          warranty_date,
          price_usd,
          is_used: false,
        });
        created.push({ id: row.id, serial_number: row.serial_number });
      } catch (err) {
        let msg = err.message || "Insert failed";
        if (err.name === "SequelizeUniqueConstraintError") {
          msg = ASSET_CONSTANTS.SERIAL_EXISTS;
        }
        errors.push({ row: rowIndex, error: msg });
      }
    }

    if (created.length > 0) {
      recordActivity(req, {
        action: "asset.import",
        entity_type: "asset",
        entity_id: null,
        entity_label: `Imported ${created.length} asset${created.length === 1 ? "" : "s"}`,
        metadata: {
          total_rows: rows.length,
          created: created.length,
          failed: errors.length,
          created_items: created,
        },
      });
    }
    return res.status(200).json(
      Response.sendResponse(
        true,
        {
          total: rows.length,
          created: created.length,
          failed: errors.length,
          created_items: created,
          errors,
        },
        `Imported ${created.length} of ${rows.length}`,
        200
      )
    );
  } catch (err) {
    console.error("importAssets", err);
    return res
      .status(500)
      .json(
        Response.sendResponse(
          false,
          null,
          err.message || ASSET_CONSTANTS.ERROR_OCCURED,
          500
        )
      );
  }
};

module.exports = {
  createAsset,
  getAllAssets,
  findAssetById,
  updateAsset,
  deleteAsset,
  retireAsset,
  reportMissingAsset,
  markMaintenanceAsset,
  restoreAsset,
  downloadAssetTemplate,
  importAssets,
};
