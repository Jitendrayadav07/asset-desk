const Joi = require("joi");

const ROLE_VALUES = ["admin", "user"];

const userValidation = {
  createUser: Joi.object().keys({
    email: Joi.string().trim().email().required(),
    display_name: Joi.string().trim().max(255).optional().allow(null, ""),
    given_name: Joi.string().trim().max(120).optional().allow(null, ""),
    family_name: Joi.string().trim().max(120).optional().allow(null, ""),
    is_active: Joi.boolean().optional(),
    role: Joi.string().valid(...ROLE_VALUES).optional(),
  }),

  getUser: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),

  putUser: Joi.object()
    .keys({
      id: Joi.number().integer().min(1).required(),
      display_name: Joi.string().trim().allow(null, "").optional(),
      given_name: Joi.string().trim().allow(null, "").optional(),
      family_name: Joi.string().trim().allow(null, "").optional(),
      is_active: Joi.boolean().optional(),
      role: Joi.string().valid(...ROLE_VALUES).optional(),
    })
    .min(2)
    .messages({
      "object.min": "Body must include id and at least one field to update",
    }),

  deleteUser: Joi.object().keys({
    id: Joi.number().integer().min(1).required(),
  }),
};

module.exports = userValidation;
