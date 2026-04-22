const Joi = require("joi");

const assetConditionSchema = {
  createAssetCondition: Joi.object().keys({
    name: Joi.string().trim().required(),
  }),

  getAssetCondition: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  putAssetCondition: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
    name: Joi.string().trim().required(),
  }),

  deleteAssetCondition: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),
};

module.exports = assetConditionSchema;
