const Response = require("../../classes/Response");

const JoiMiddleWare = (schema, property) => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: true,
      convert: true,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details && error.details[0] ? error.details[0].message : error.message;
      return res.status(400).json(Response.sendResponse(false, null, message, 400));
    }
    next();
  };
};

module.exports = JoiMiddleWare;
