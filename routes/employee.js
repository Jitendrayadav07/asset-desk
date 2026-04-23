const express = require("express");
const router = express.Router();

const employeeController = require("../controllers/employeeController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const employeeValidation = require("../validations/employeeValidation");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Employees
 *     description: Employee directory (name, email, location, emp_id)
 */

// IMPORTANT: literal paths (/import-template, /import) must be declared
// BEFORE the /:id routes below — Express matches routes in registration
// order, and /:id would otherwise greedily catch /import-template and fail
// Joi validation with "id must be a number".

/**
 * @openapi
 * /employee/import-template:
 *   get:
 *     tags: [Employees]
 *     summary: Download an xlsx template for bulk employee import
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: An xlsx file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get("/import-template", jwtMiddleware, employeeController.downloadEmployeeTemplate);

/**
 * @openapi
 * /employee/import:
 *   post:
 *     tags: [Employees]
 *     summary: Bulk-import employees from an xlsx/csv file
 *     description: >
 *       Upload the filled template as multipart/form-data with field name
 *       `file`. Each row is validated and inserted independently; the
 *       response reports created count + row-level errors.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import completed (partial successes are still 200)
 *       400:
 *         description: No file or empty spreadsheet
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.post("/import", jwtMiddleware, employeeController.importEmployees);

/**
 * @openapi
 * /employee/create-employee:
 *   post:
 *     tags: [Employees]
 *     summary: Create employee
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeCreateBody'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Duplicate email or emp_id
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.post(
  "/create-employee",
  jwtMiddleware,
  JoiMiddleWare(employeeValidation.createEmployee, "body"),
  employeeController.createEmployee
);

/**
 * @openapi
 * /employee/get-all-employees:
 *   get:
 *     tags: [Employees]
 *     summary: List all employees
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Missing or invalid JWT
 */
router.get("/get-all-employees", jwtMiddleware, employeeController.getAllEmployees);

/**
 * @openapi
 * /employee/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Get employee by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Not found
 *       401:
 *         description: Missing or invalid JWT
 *   delete:
 *     tags: [Employees]
 *     summary: Delete employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(employeeValidation.getEmployee, "params"),
  employeeController.findEmployeeById
);

/**
 * @openapi
 * /employee:
 *   put:
 *     tags: [Employees]
 *     summary: Update employee
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeUpdateBody'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Duplicate email or emp_id
 *       404:
 *         description: Not found
 */
router.put(
  "/",
  jwtMiddleware,
  JoiMiddleWare(employeeValidation.putEmployee, "body"),
  employeeController.updateEmployee
);

router.delete(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(employeeValidation.deleteEmployee, "params"),
  employeeController.deleteEmployee
);

/**
 * @openapi
 * /employee/{id}/left-job:
 *   post:
 *     tags: [Employees]
 *     summary: Mark employee as left the job
 *     description: >
 *       Records that the employee has left: stamps `left_at` to now, stores the
 *       reason, and (optionally) who recorded it. Fails if the employee is
 *       already marked as left.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Resigned effective 2026-05-01
 *               left_by:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Employee marked as left
 *       400:
 *         description: Already left or validation error
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/left-job",
  jwtMiddleware,
  JoiMiddleWare(employeeValidation.lifecycleParams, "params"),
  JoiMiddleWare(employeeValidation.leftJobBody, "body"),
  employeeController.markEmployeeLeft
);

/**
 * @openapi
 * /employee/{id}/rejoin:
 *   post:
 *     tags: [Employees]
 *     summary: Rejoin a former employee
 *     description: >
 *       Clears the "left the job" metadata (`left_at`, `left_reason`, `left_by`)
 *       so the employee is active again. Fails if the employee has not left.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejoined_by:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Employee rejoined
 *       400:
 *         description: Employee has not left
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/rejoin",
  jwtMiddleware,
  JoiMiddleWare(employeeValidation.lifecycleParams, "params"),
  JoiMiddleWare(employeeValidation.rejoinBody, "body"),
  employeeController.rejoinEmployee
);

module.exports = router;
