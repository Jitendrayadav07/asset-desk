const Response = require("../../classes/Response");

/**
 * Gate a route behind one of the listed roles. Must run AFTER jwtMiddleware
 * so `req.user.role` is populated.
 *
 * Usage:
 *   router.post("/x", jwtMiddleware, requireRole("admin", "user"), handler);
 *
 * Why this exists in addition to requireAdmin: with the hr-user role added,
 * we now need granular gating where some routes accept admin + user but
 * not hr-user (asset/assignment mutations), or admin + hr-user (employee
 * mutations would still allow regular users today, so this is mainly
 * for *blocking* hr-user from things they shouldn't touch).
 */
const requireRole = (...allowed) => (req, res, next) => {
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
  if (!allowed.includes(role)) {
    return res
      .status(403)
      .json(Response.sendResponse(false, null, "You don't have access to this action", 403));
  }
  return next();
};

module.exports = requireRole;
