const express = require("express");
const router = express.Router();

const assignmentController = require("../controllers/assignmentController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const assignmentValidation = require("../validations/assignmentValidation");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");
const requireRole = require("../middlewares/rbac/requireRole");

// HR-user is read-only on assignments — they can view the list, but cannot
// create new assignments or unassign existing ones.
const requireAssignmentWriter = requireRole("admin", "user");

/**
 * @openapi
 * tags:
 *   - name: Assignments
 *     description: Asset ↔ employee assignment lifecycle (issue, return)
 */

/**
 * @openapi
 * /assignment/create-assignment:
 *   post:
 *     tags: [Assignments]
 *     summary: Assign an asset to an employee
 *     description: >
 *       Issues the asset to the employee. Rejects retired, missing, or
 *       already-assigned assets, and employees who have left. Records
 *       `hostname` and `aid` on the assignment row.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset_id, employee_id, hostname, aid]
 *             properties:
 *               asset_id:    { type: integer, minimum: 1 }
 *               employee_id: { type: integer, minimum: 1 }
 *               hostname:    { type: string, example: LAP-JD-07 }
 *               aid:         { type: string, example: CS-42ab9...  }
 *               note:        { type: string, nullable: true }
 *               assigned_by: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation error, already assigned, retired/missing asset, or ex-employee
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Asset or employee not found
 *       500:
 *         description: Server error
 */
router.post(
  "/create-assignment",
  jwtMiddleware,
  requireAssignmentWriter,
  JoiMiddleWare(assignmentValidation.createAssignment, "body"),
  assignmentController.createAssignment
);

/**
 * @openapi
 * /assignment/get-all-assignments:
 *   get:
 *     tags: [Assignments]
 *     summary: List assignments
 *     description: >
 *       Defaults to all. Pass `status=active` for currently-issued,
 *       `status=returned` for historical. Optional `asset_id` or
 *       `employee_id` filters. Results include the joined asset (with
 *       its type/status/condition lookups) and employee.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, returned, all] }
 *       - in: query
 *         name: asset_id
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: employee_id
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Success }
 *       401: { description: Missing or invalid JWT }
 *       500: { description: Server error }
 */
router.get(
  "/get-all-assignments",
  jwtMiddleware,
  JoiMiddleWare(assignmentValidation.getAllQuery, "query"),
  assignmentController.getAllAssignments
);

/**
 * @openapi
 * /assignment/{id}:
 *   get:
 *     tags: [Assignments]
 *     summary: Get assignment by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Success }
 *       404: { description: Not found }
 */
router.get(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(assignmentValidation.idParam, "params"),
  assignmentController.findAssignmentById
);

/**
 * @openapi
 * /assignment/{id}/unassign:
 *   post:
 *     tags: [Assignments]
 *     summary: Unassign (return) an assignment
 *     description: >
 *       Marks the assignment returned with the required reason. Fails if
 *       the assignment was already returned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:        { type: string, example: Laptop returned during offboarding }
 *               unassigned_by: { type: string, nullable: true }
 *     responses:
 *       200: { description: Unassigned }
 *       400: { description: Already unassigned or validation error }
 *       404: { description: Not found }
 */
router.post(
  "/:id/unassign",
  jwtMiddleware,
  requireAssignmentWriter,
  JoiMiddleWare(assignmentValidation.idParam, "params"),
  JoiMiddleWare(assignmentValidation.unassignBody, "body"),
  assignmentController.unassignAssignment
);

module.exports = router;
