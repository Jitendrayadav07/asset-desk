const { Op } = require("sequelize");
const Response = require("../classes/Response");
const db = require("../config/db.config");
const ASSET_CONSTANTS = require("../constants/assetConstants");

const includeLookups = [
  { model: db.assetType, as: "assetType", attributes: ["id", "name"] },
  { model: db.assetStatus, as: "assetStatus", attributes: ["id", "name"] },
  { model: db.assetCondition, as: "assetCondition", attributes: ["id", "name"] },
];

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
    body.price_usd = normalizePrice(body.price_usd);
    body.model_number = body.model_number === "" ? null : body.model_number;
    body.configuration_specs =
      body.configuration_specs === "" ? null : body.configuration_specs;

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
    const destroyed = await db.asset.destroy({ where: { id: req.params.id } });
    if (!destroyed) {
      return res.status(404).json(Response.sendResponse(false, null, ASSET_CONSTANTS.NOT_FOUND, 404));
    }
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

module.exports = {
  createAsset,
  getAllAssets,
  findAssetById,
  updateAsset,
  deleteAsset,
};
