const Response = require("../classes/Response");
const db = require("../config/db.config");
const ASSET_CONDITION_CONSTANTS = require("../constants/assetConditionConstants");

const createAssetCondition = async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await db.assetCondition.findOne({ where: { name } });
    if (existing) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, ASSET_CONDITION_CONSTANTS.ALREADY_EXISTS, 400));
    }
    const created = await db.assetCondition.create(req.body);
    return res
      .status(201)
      .json(Response.sendResponse(true, created, ASSET_CONDITION_CONSTANTS.CREATED, 201));
  } catch (err) {
    console.error("createAssetCondition", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONDITION_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const getAllAssetConditions = async (req, res) => {
  try {
    const rows = await db.assetCondition.findAll({ order: [["name", "ASC"]] });
    return res.status(200).json(Response.sendResponse(true, rows, null, 200));
  } catch (err) {
    console.error("getAllAssetConditions", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONDITION_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const findAssetConditionById = async (req, res) => {
  try {
    const row = await db.assetCondition.findOne({ where: { id: req.params.id } });
    return res.status(200).json(Response.sendResponse(true, row, null, 200));
  } catch (err) {
    console.error("findAssetConditionById", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONDITION_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const updateAssetCondition = async (req, res) => {
  try {
    const updated = await db.assetCondition.update(req.body, {
      where: { id: req.body.id },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, ASSET_CONDITION_CONSTANTS.UPDATED, 200));
  } catch (err) {
    console.error("updateAssetCondition", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONDITION_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const deleteAssetCondition = async (req, res) => {
  try {
    const destroyed = await db.assetCondition.destroy({ where: { id: req.params.id } });
    return res
      .status(200)
      .json(Response.sendResponse(true, destroyed, ASSET_CONDITION_CONSTANTS.DELETED, 200));
  } catch (err) {
    console.error("deleteAssetCondition", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, ASSET_CONDITION_CONSTANTS.ERROR_OCCURED, 500));
  }
};

module.exports = {
  createAssetCondition,
  getAllAssetConditions,
  findAssetConditionById,
  updateAssetCondition,
  deleteAssetCondition,
};
