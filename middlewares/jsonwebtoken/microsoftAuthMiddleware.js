const jwt = require("jsonwebtoken");
const jwtConfig = require("../../config/jwtTokenKey");
const Response = require("../../classes/Response");

const microsoftAuthMiddleware = (req, res, next) => {
  const token = req.cookies && req.cookies.microsoftAuthToken;
  if (!token) {
    return res
      .status(401)
      .json(Response.sendResponse(false, null, "Missing microsoftAuthToken cookie", 401));
  }
  jwt.verify(token, jwtConfig.secret, (err, decoded) => {
    if (err) {
      const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
      return res.status(403).json(Response.sendResponse(false, null, message, 403));
    }
    req.user = decoded;
    return next();
  });
};

module.exports = microsoftAuthMiddleware;
