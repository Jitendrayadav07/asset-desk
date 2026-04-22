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
};

module.exports = employeeValidation;
