const { Op } = require("sequelize");
const Response = require("../classes/Response");
const db = require("../config/db.config");

/**
 * Fire-and-forget audit log writer. Call this from success paths in other
 * controllers. Never `await` it for latency; never let it throw — a broken
 * audit log must not break real user actions.
 *
 * `actor` is pulled from `req.user` (JWT claims) when available. For
 * pre-JWT events (eg the final step of microsoftLoginSuccess) the caller
 * passes an explicit `actor` object instead.
 *
 * @param {import("express").Request} req
 * @param {{
 *   action: string,
 *   entity_type: string,
 *   entity_id?: number|string|null,
 *   entity_label?: string|null,
 *   metadata?: Record<string, any>,
 *   actor?: { user_id?: number|string|null, email_id?: string|null, role?: string|null }
 * }} params
 */
function recordActivity(req, params) {
  try {
    const claims = params.actor ?? req?.user ?? {};
    const payload = {
      actor_user_id: claims.user_id != null ? Number(claims.user_id) : null,
      actor_email: claims.email_id ?? null,
      actor_role: claims.role ?? null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id:
        params.entity_id != null && params.entity_id !== ""
          ? Number(params.entity_id)
          : null,
      entity_label: params.entity_label ?? null,
      metadata: params.metadata && typeof params.metadata === "object" ? params.metadata : {},
    };
    // Don't await — any logging error must not affect the caller.
    db.activity
      .create(payload)
      .catch((err) => console.error("[activity] failed to record", params.action, err.message));
  } catch (err) {
    console.error("[activity] recordActivity threw", err.message);
  }
}

const VALID_ENTITY_TYPES = ["asset", "employee", "assignment", "user", "auth"];

const getAllActivities = async (req, res) => {
  try {
    const {
      actor_user_id,
      entity_type,
      entity_id,
      action,
      from,
      to,
      page = "1",
      page_size = "50",
    } = req.query;

    const where = {};
    if (actor_user_id) where.actor_user_id = Number(actor_user_id);
    if (entity_type && VALID_ENTITY_TYPES.includes(String(entity_type))) {
      where.entity_type = entity_type;
    }
    if (entity_id) where.entity_id = Number(entity_id);
    if (action) where.action = action;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(page_size) || 50));

    const { rows, count } = await db.activity.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      include: [
        {
          model: db.user,
          as: "actor",
          attributes: ["id", "email", "display_name", "role"],
          required: false,
        },
      ],
    });

    return res.status(200).json(
      Response.sendResponse(
        true,
        {
          items: rows,
          total: count,
          page: pageNum,
          page_size: pageSize,
        },
        null,
        200
      )
    );
  } catch (err) {
    console.error("getAllActivities", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, "Failed to load activity log", 500));
  }
};

module.exports = {
  recordActivity,
  getAllActivities,
};
