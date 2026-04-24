const Response = require("../classes/Response");
const db = require("../config/db.config");
const ASSET_TYPE_CONSTANTS = require("../constants/assetTypeConstants");

const createAssetType = async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await db.assetType.findOne({ where: { name } });
    if (existing) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_TYPE_CONSTANTS.ALREADY_EXISTS, 400));
    }
    const created = await db.assetType.create(req.body);
    return res
      .status(201)
      .json(Response.sendResponse(true, created, ASSET_TYPE_CONSTANTS.CREATED, 201));
  } catch (err) {
    console.error("createAssetType", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_TYPE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const getAllAssetTypes = async (req, res) => {
  try {
    // Insertion order (seeder order) — avoids an alphabetical reshuffle so the
    // dropdown presents types in the curated order defined by the seed.
    const rows = await db.assetType.findAll({ order: [["id", "ASC"]] });
    return res.status(200).json(Response.sendResponse(true, rows, null, 200));
  } catch (err) {
    console.error("getAllAssetTypes", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_TYPE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const findAssetTypeById = async (req, res) => {
  try {
    const row = await db.assetType.findOne({ where: { id: req.params.id } });
    return res.status(200).json(Response.sendResponse(true, row, null, 200));
  } catch (err) {
    console.error("findAssetTypeById", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_TYPE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const updateAssetType = async (req, res) => {
  try {
    const updated = await db.assetType.update(req.body, {
      where: { id: req.body.id },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, ASSET_TYPE_CONSTANTS.UPDATED, 200));
  } catch (err) {
    console.error("updateAssetType", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_TYPE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const deleteAssetType = async (req, res) => {
  try {
    const destroyed = await db.assetType.destroy({ where: { id: req.params.id } });
    return res
      .status(200)
      .json(Response.sendResponse(true, destroyed, ASSET_TYPE_CONSTANTS.DELETED, 200));
  } catch (err) {
    console.error("deleteAssetType", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_TYPE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

module.exports = {
  createAssetType,
  getAllAssetTypes,
  findAssetTypeById,
  updateAssetType,
  deleteAssetType,
};
