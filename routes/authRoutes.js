const express = require("express");
const router = express.Router();
const passport = require("../config/passport");

const authController = require("../controllers/authController");
const microsoftAuthMiddleware = require("../middlewares/jsonwebtoken/microsoftAuthMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints (Microsoft OAuth)
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:            { type: integer, example: 1 }
 *         email:         { type: string,  example: "user@example.com" }
 *         display_name:  { type: string,  nullable: true }
 *         given_name:    { type: string,  nullable: true }
 *         family_name:   { type: string,  nullable: true }
 *         microsoft_id:  { type: string,  nullable: true }
 *         login_type:    { type: integer, description: "1=email, 2=google, 3=microsoft", example: 3 }
 *         is_active:     { type: boolean, example: true }
 *         last_login:    { type: string,  format: date-time, nullable: true }
 *         created_at:    { type: string,  format: date-time }
 *         updated_at:    { type: string,  format: date-time }
 *         token:         { type: string,  description: "Final application JWT" }
 */

/**
 * @openapi
 * /auth/microsoft:
 *   get:
 *     tags: [Auth]
 *     summary: Start Microsoft OAuth login
 *     description: Redirects the browser to Microsoft's OAuth consent screen.
 *     responses:
 *       302:
 *         description: Redirect to Microsoft login
 */
router.get(
  "/microsoft",
  passport.authenticate("microsoft", { scope: ["openid", "profile", "user.read"] })
);

/**
 * @openapi
 * /auth/microsoft/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Microsoft OAuth callback
 *     description: Microsoft redirects here after consent. Issues a signed JWT cookie and redirects to the frontend success page.
 *     responses:
 *       302:
 *         description: Redirect to frontend success URL
 */
router.get(
  "/microsoft/callback",
  passport.authenticate("microsoft", { failureRedirect: "/api/auth/login/failed" }),
  authController.microsoftCallback
);

/**
 * @openapi
 * /auth/login/microsoft-success:
 *   get:
 *     tags: [Auth]
 *     summary: Exchange the Microsoft auth cookie for a final JWT
 *     description: Frontend calls this with credentials after landing on the success page. Reads the `microsoftAuthToken` cookie and returns a fresh application JWT.
 *     responses:
 *       200:
 *         description: Login success
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiEnvelope'
 *                 - type: object
 *                   properties:
 *                     result: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Missing microsoftAuthToken cookie
 *       403:
 *         description: Invalid or expired token, or user deactivated
 *       404:
 *         description: User not found
 */
router.get(
  "/login/microsoft-success",
  microsoftAuthMiddleware,
  authController.microsoftLoginSuccess
);

/**
 * @openapi
 * /auth/login/failed:
 *   get:
 *     tags: [Auth]
 *     summary: OAuth failure landing route
 *     responses:
 *       401:
 *         description: Authentication failed
 */
router.get("/login/failed", (req, res) => {
  res.status(401).json({
    isSuccess: false,
    result: null,
    message: "Authentication failed",
    statusCode: 401,
  });
});

module.exports = router;
