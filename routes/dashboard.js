const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Dashboard
 *     description: Aggregate metrics and activity feed for the home dashboard.
 */

/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get every number and breakdown the home dashboard needs in one call
 *     description: >
 *       Returns KPI counts (total / assigned / available / retired / missing /
 *       maintenance / employees), inventory breakdowns by type / status /
 *       condition / location (top 10), and the 10 most-recent assignment
 *       events (with asset + employee joined).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.get("/stats", jwtMiddleware, dashboardController.getDashboardStats);

module.exports = router;
