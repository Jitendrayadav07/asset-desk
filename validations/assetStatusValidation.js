const Joi = require("joi");

const assetStatusSchema = {
  createAssetStatus: Joi.object().keys({
    name: Joi.string().trim().required(),
  }),

  getAssetStatus: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  putAssetStatus: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
    name: Joi.string().trim().required(),
  }),

  deleteAssetStatus: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),
};

module.exports = assetStatusSchema;
