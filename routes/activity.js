const express = require("express");
const router = express.Router();

const activityController = require("../controllers/activityController");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");
const requireAdmin = require("../middlewares/rbac/requireAdmin");

/**
 * @openapi
 * tags:
 *   - name: Activity
 *     description: Append-only audit log of user actions (admin-only read).
 */

/**
 * @openapi
 * /activity/get-all-activities:
 *   get:
 *     tags: [Activity]
 *     summary: List audit-log entries (admin)
 *     description: >
 *       Paginated, newest-first. Filter by `actor_user_id`, `entity_type`,
 *       `entity_id`, `action`, or date range `from` / `to` (ISO 8601).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actor_user_id
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: entity_type
 *         schema: { type: string, enum: [asset, employee, assignment, user, auth] }
 *       - in: query
 *         name: entity_id
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: page_size
 *         schema: { type: integer, minimum: 1, maximum: 200, default: 50 }
 *     responses:
 *       200: { description: Success }
 *       401: { description: Missing or invalid JWT }
 *       403: { description: Admin access required }
 *       500: { description: Server error }
 */
router.get(
  "/get-all-activities",
  jwtMiddleware,
  requireAdmin,
  activityController.getAllActivities
);

module.exports = router;
