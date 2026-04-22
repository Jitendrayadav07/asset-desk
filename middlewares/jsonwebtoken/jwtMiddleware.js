const jwt = require("jsonwebtoken");
const jwtConfig = require("../../config/jwtTokenKey");
const Response = require("../../classes/Response");

const jwtMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json(Response.sendResponse(false, null, "Missing or malformed Authorization header", 401));
    }

    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded;
    return next();
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json(Response.sendResponse(false, null, message, 401));
  }
};

module.exports = jwtMiddleware;
