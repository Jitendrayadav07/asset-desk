const Joi = require("joi");

const assignmentValidation = {
  createAssignment: Joi.object().keys({
    asset_id: Joi.number().integer().min(1).required(),
    employee_id: Joi.number().integer().min(1).required(),
    // Required-ness depends on the asset's type (Laptop/Desktop only) and is
    // enforced inside the controller after we look up the asset. Validation
    // here just caps the length + accepts empty for non-device assets.
    hostname: Joi.string().trim().max(255).optional().allow(null, ""),
    aid: Joi.string().trim().max(255).optional().allow(null, ""),
    note: Joi.string().trim().max(2000).optional().allow(null, ""),
    assigned_by: Joi.string().trim().max(255).optional().allow(null, ""),
  }),

  getAllQuery: Joi.object()
    .keys({
      status: Joi.string().valid("active", "returned", "all").optional(),
      asset_id: Joi.number().integer().min(1).optional(),
      employee_id: Joi.number().integer().min(1).optional(),
    })
    .unknown(true),

  idParam: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  unassignBody: Joi.object().keys({
    reason: Joi.string().trim().min(1).max(2000).required(),
    unassigned_by: Joi.string().trim().max(255).optional().allow(null, ""),
    // How the device came back. Drives the asset's post-return status.
    //   good (default) -> unassigned
    //   maintenance    -> maintenance (plus reason stored as maintenance context)
    //   retired        -> retired     (reason becomes retired_reason)
    //   missing        -> missing     (reason becomes missing_reason)
    return_condition: Joi.string()
      .valid("good", "maintenance", "retired", "missing")
      .optional(),
  }),
};

module.exports = assignmentValidation;
