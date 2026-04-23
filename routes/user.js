const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const userValidation = require("../validations/userValidation");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User directory (Microsoft login creates accounts; no HTTP create here)
 */

/**
 * @openapi
 * /user/create-user:
 *   post:
 *     tags: [Users]
 *     summary: Create a user (local)
 *     description: >
 *       Admin-created user record. `login_type` defaults to 1 (email) and
 *       `microsoft_id` is null. If the same email later signs in via Microsoft,
 *       the upsert on login links the `microsoft_id` and bumps `login_type` to 3.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:         { type: string, format: email }
 *               display_name:  { type: string, nullable: true }
 *               given_name:    { type: string, nullable: true }
 *               family_name:   { type: string, nullable: true }
 *               is_active:     { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation error or duplicate email
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.post(
  "/create-user",
  jwtMiddleware,
  JoiMiddleWare(userValidation.createUser, "body"),
  userController.createUser
);

/**
 * @openapi
 * /user/get-all-users:
 *   get:
 *     tags: [Users]
 *     summary: List all users
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
router.get("/get-all-users", jwtMiddleware, userController.getAllUsers);

/**
 * @openapi
 * /user/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by id
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
 *     tags: [Users]
 *     summary: Delete user
 *     description: Cannot delete the signed-in user (same id as JWT `user_id`).
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
 *         description: Deleted (result is row count)
 *       400:
 *         description: Attempt to delete self
 *       404:
 *         description: Not found
 *       401:
 *         description: Missing or invalid JWT
 */
router.get(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(userValidation.getUser, "params"),
  userController.findUserById
);

/**
 * @openapi
 * /user:
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     description: >
 *       Allowed fields only — `display_name`, `given_name`, `family_name`, `is_active`.
 *       Email and Microsoft ids are not changed here (users come from Microsoft login).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateBody'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Not found
 *       401:
 *         description: Missing or invalid JWT
 */
router.put(
  "/",
  jwtMiddleware,
  JoiMiddleWare(userValidation.putUser, "body"),
  userController.updateUser
);

router.delete(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(userValidation.deleteUser, "params"),
  userController.deleteUser
);

module.exports = router;
