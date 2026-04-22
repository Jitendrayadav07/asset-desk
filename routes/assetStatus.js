const express = require("express");
const router = express.Router();

const assetStatusController = require("../controllers/assetStatusController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const assetStatusSchema = require("../validations/assetStatusValidation");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Asset statuses
 *     description: CRUD for asset status lookup (e.g. active, retired)
 */

/**
 * @openapi
 * /asset-status/create-asset-status:
 *   post:
 *     tags: [Asset statuses]
 *     summary: Create asset status
 *     description: Does not require JWT. Returns 400 if `name` already exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetLookupCreateBody'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiEnvelope'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       $ref: '#/components/schemas/AssetLookupRecord'
 *       400:
 *         description: Validation error or duplicate name
 *       500:
 *         description: Server error
 */
router.post(
  "/create-asset-status",
  JoiMiddleWare(assetStatusSchema.createAssetStatus, "body"),
  assetStatusController.createAssetStatus
);

/**
 * @openapi
 * /asset-status/get-all-asset-statuses:
 *   get:
 *     tags: [Asset statuses]
 *     summary: List all asset statuses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiEnvelope'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AssetLookupRecord'
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.get(
  "/get-all-asset-statuses",
  jwtMiddleware,
  assetStatusController.getAllAssetStatuses
);

/**
 * @openapi
 * /asset-status/{id}:
 *   get:
 *     tags: [Asset statuses]
 *     summary: Get asset status by id
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
 *         description: Success (result may be null if not found)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiEnvelope'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       nullable: true
 *                       oneOf:
 *                         - $ref: '#/components/schemas/AssetLookupRecord'
 *                         - type: 'null'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Asset statuses]
 *     summary: Delete asset status
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
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiEnvelope'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(assetStatusSchema.getAssetStatus, "params"),
  assetStatusController.findAssetStatusById
);

/**
 * @openapi
 * /asset-status:
 *   put:
 *     tags: [Asset statuses]
 *     summary: Update asset status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetLookupUpdateBody'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiEnvelope'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items: { type: integer }
 *                       example: [1]
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.put(
  "/",
  jwtMiddleware,
  JoiMiddleWare(assetStatusSchema.putAssetStatus, "body"),
  assetStatusController.updateAssetStatus
);

router.delete(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(assetStatusSchema.deleteAssetStatus, "params"),
  assetStatusController.deleteAssetStatus
);

module.exports = router;
