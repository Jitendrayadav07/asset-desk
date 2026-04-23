const Joi = require("joi");

const purchaseDateSchema = Joi.alternatives().try(
  Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  Joi.date().iso(),
  Joi.valid(null)
);

const assetValidation = {
  createAsset: Joi.object().keys({
    serial_number: Joi.string().trim().required(),
    asset_type_id: Joi.number().integer().min(1).required(),
    asset_status_id: Joi.number().integer().min(1).optional().allow(null),
    asset_condition_id: Joi.number().integer().min(1).optional().allow(null),
    name_model: Joi.string().trim().required(),
    brand: Joi.string().trim().required(),
    model_number: Joi.string().trim().optional().allow(null, ""),
    configuration_specs: Joi.string().trim().optional().allow(null, ""),
    location: Joi.string().trim().required(),
    purchase_date: purchaseDateSchema.optional(),
    price_usd: Joi.number().min(0).optional().allow(null),
  }),

  getAllAssetsQuery: Joi.object()
    .keys({
      asset_type: Joi.string().trim().max(120).optional().allow(null, ""),
    })
    .unknown(true),

  getAsset: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  putAsset: Joi.object()
    .keys({
      id: Joi.number().integer().min(1).required(),
      serial_number: Joi.string().trim().optional(),
      asset_type_id: Joi.number().integer().min(1).optional(),
      asset_status_id: Joi.number().integer().min(1).optional().allow(null),
      asset_condition_id: Joi.number().integer().min(1).optional().allow(null),
      name_model: Joi.string().trim().optional(),
      brand: Joi.string().trim().optional(),
      model_number: Joi.string().trim().optional().allow(null, ""),
      configuration_specs: Joi.string().trim().optional().allow(null, ""),
      location: Joi.string().trim().optional(),
      purchase_date: purchaseDateSchema.optional(),
      price_usd: Joi.number().min(0).optional().allow(null),
    })
    .min(2)
    .messages({
      "object.min": "Body must include id and at least one field to update",
    }),

  deleteAsset: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  lifecycleParams: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  retireAssetBody: Joi.object().keys({
    reason: Joi.string().trim().min(1).max(2000).required(),
    retired_by: Joi.string().trim().max(255).optional().allow(null, ""),
  }),

  reportMissingBody: Joi.object().keys({
    reason: Joi.string().trim().min(1).max(2000).required(),
    last_known_location: Joi.string().trim().max(255).optional().allow(null, ""),
    reported_by: Joi.string().trim().max(255).optional().allow(null, ""),
  }),

  restoreAssetBody: Joi.object().keys({
    restored_by: Joi.string().trim().max(255).optional().allow(null, ""),
  }),
};

module.exports = assetValidation;
