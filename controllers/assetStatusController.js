const Response = require("../classes/Response");
const db = require("../config/db.config");
const ASSET_STATUS_CONSTANTS = require("../constants/assetStatusConstants");

const createAssetStatus = async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await db.assetStatus.findOne({ where: { name } });
    if (existing) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_STATUS_CONSTANTS.ALREADY_EXISTS, 400));
    }
    const created = await db.assetStatus.create(req.body);
    return res
      .status(201)
      .json(Response.sendResponse(true, created, ASSET_STATUS_CONSTANTS.CREATED, 201));
  } catch (err) {
    console.error("createAssetStatus", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_STATUS_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const getAllAssetStatuses = async (req, res) => {
  try {
    const rows = await db.assetStatus.findAll({ order: [["name", "ASC"]] });
    return res.status(200).json(Response.sendResponse(true, rows, null, 200));
  } catch (err) {
    console.error("getAllAssetStatuses", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_STATUS_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const findAssetStatusById = async (req, res) => {
  try {
    const row = await db.assetStatus.findOne({ where: { id: req.params.id } });
    return res.status(200).json(Response.sendResponse(true, row, null, 200));
  } catch (err) {
    console.error("findAssetStatusById", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_STATUS_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const updateAssetStatus = async (req, res) => {
  try {
    const updated = await db.assetStatus.update(req.body, {
      where: { id: req.body.id },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, ASSET_STATUS_CONSTANTS.UPDATED, 200));
  } catch (err) {
    console.error("updateAssetStatus", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_STATUS_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const deleteAssetStatus = async (req, res) => {
  try {
    const destroyed = await db.assetStatus.destroy({ where: { id: req.params.id } });
    return res
      .status(200)
      .json(Response.sendResponse(true, destroyed, ASSET_STATUS_CONSTANTS.DELETED, 200));
  } catch (err) {
    console.error("deleteAssetStatus", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_STATUS_CONSTANTS.ERROR_OCCURED, 500));
  }
};

module.exports = {
  createAssetStatus,
  getAllAssetStatuses,
  findAssetStatusById,
  updateAssetStatus,
  deleteAssetStatus,
};
