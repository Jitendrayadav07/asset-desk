const express = require("express");
const router = express.Router();

const assetTypeController = require("../controllers/assetTypeController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const assetTypeSchema = require("../validations/assetTypeValidation");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Asset types
 *     description: CRUD for asset type lookup (e.g. Laptop, Desktop)
 */

/**
 * @openapi
 * /asset-type/create-asset-type:
 *   post:
 *     tags: [Asset types]
 *     summary: Create asset type
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiEnvelope'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiEnvelope'
 */
router.post(
  "/create-asset-type",
  JoiMiddleWare(assetTypeSchema.createAssetType, "body"),
  assetTypeController.createAssetType
);

/**
 * @openapi
 * /asset-type/get-all-asset-types:
 *   get:
 *     tags: [Asset types]
 *     summary: List all asset types
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiEnvelope'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiEnvelope'
 */
router.get("/get-all-asset-types", jwtMiddleware, assetTypeController.getAllAssetTypes);

/**
 * @openapi
 * /asset-type/{id}:
 *   get:
 *     tags: [Asset types]
 *     summary: Get asset type by id
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
 *     tags: [Asset types]
 *     summary: Delete asset type
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
 *                       description: Number of rows deleted
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
  JoiMiddleWare(assetTypeSchema.getAssetType, "params"),
  assetTypeController.findAssetTypeById
);

/**
 * @openapi
 * /asset-type:
 *   put:
 *     tags: [Asset types]
 *     summary: Update asset type
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
 *                       description: Sequelize update result — number of rows affected
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
  JoiMiddleWare(assetTypeSchema.putAssetType, "body"),
  assetTypeController.updateAssetType
);

router.delete(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(assetTypeSchema.deleteAssetType, "params"),
  assetTypeController.deleteAssetType
);

module.exports = router;
