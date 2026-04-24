const Response = require("../../classes/Response");

/**
 * Gate an express route behind the `admin` role. Must run AFTER jwtMiddleware
 * so `req.user.role` is populated from the decoded token.
 *
 * Fresh JWTs issued after migration 005 include `role`. If an older token is
 * presented (pre-RBAC), we reject with a clear message so the client forces a
 * re-login and picks up the new claim.
 */
const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (!role) {
    return res
      .status(401)
      .json(
        Response.sendResponse(
          false,
          null,
          "Session is missing a role claim — please sign in again",
          401
        )
      );
  }
  if (role !== "admin") {
    return res
      .status(403)
      .json(Response.sendResponse(false, null, "Admin access required", 403));
  }
  return next();
};

module.exports = requireAdmin;
