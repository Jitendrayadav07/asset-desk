const express = require("express");
const router = express.Router();

const assetConditionController = require("../controllers/assetConditionController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const assetConditionSchema = require("../validations/assetConditionValidation");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Asset conditions
 *     description: CRUD for asset condition lookup (e.g. new, good, fair, poor)
 */

/**
 * @openapi
 * /asset-condition/create-asset-condition:
 *   post:
 *     tags: [Asset conditions]
 *     summary: Create asset condition
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
  "/create-asset-condition",
  JoiMiddleWare(assetConditionSchema.createAssetCondition, "body"),
  assetConditionController.createAssetCondition
);

/**
 * @openapi
 * /asset-condition/get-all-asset-conditions:
 *   get:
 *     tags: [Asset conditions]
 *     summary: List all asset conditions
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
  "/get-all-asset-conditions",
  jwtMiddleware,
  assetConditionController.getAllAssetConditions
);

/**
 * @openapi
 * /asset-condition/{id}:
 *   get:
 *     tags: [Asset conditions]
 *     summary: Get asset condition by id
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
 *     tags: [Asset conditions]
 *     summary: Delete asset condition
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
  JoiMiddleWare(assetConditionSchema.getAssetCondition, "params"),
  assetConditionController.findAssetConditionById
);

/**
 * @openapi
 * /asset-condition:
 *   put:
 *     tags: [Asset conditions]
 *     summary: Update asset condition
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
  JoiMiddleWare(assetConditionSchema.putAssetCondition, "body"),
  assetConditionController.updateAssetCondition
);

router.delete(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(assetConditionSchema.deleteAssetCondition, "params"),
  assetConditionController.deleteAssetCondition
);

module.exports = router;
