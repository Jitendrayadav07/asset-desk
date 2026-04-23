const Joi = require("joi");

const employeeValidation = {
  createEmployee: Joi.object().keys({
    name: Joi.string().trim().required(),
    email: Joi.string().trim().email().required(),
    location: Joi.string().trim().required(),
    emp_id: Joi.string().trim().required(),
  }),

  getEmployee: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  putEmployee: Joi.object()
    .keys({
      id: Joi.number().integer().min(1).required(),
      name: Joi.string().trim().optional(),
      email: Joi.string().trim().email().optional(),
      location: Joi.string().trim().optional(),
      emp_id: Joi.string().trim().optional(),
    })
    .min(2)
    .messages({
      "object.min": "Body must include id and at least one field to update",
    }),

  deleteEmployee: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  lifecycleParams: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  leftJobBody: Joi.object().keys({
    reason: Joi.string().trim().min(1).max(2000).required(),
    left_by: Joi.string().trim().max(255).optional().allow(null, ""),
  }),

  rejoinBody: Joi.object().keys({
    rejoined_by: Joi.string().trim().max(255).optional().allow(null, ""),
  }),
};

module.exports = employeeValidation;
