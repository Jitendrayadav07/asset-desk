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

module.exports = router;
