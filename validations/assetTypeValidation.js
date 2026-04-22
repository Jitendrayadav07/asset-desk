const Joi = require("joi");

const assetTypeSchema = {
  createAssetType: Joi.object().keys({
    name: Joi.string().trim().required(),
  }),

  getAssetType: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  putAssetType: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
    name: Joi.string().trim().required(),
  }),

  deleteAssetType: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),
};

module.exports = assetTypeSchema;
