const express = require("express");
const router = express.Router();

const assetController = require("../controllers/assetController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const assetValidation = require("../validations/assetValidation");
const jwtMiddleware = require("../middlewares/jsonwebtoken/jwtMiddleware");

/**
 * @openapi
 * tags:
 *   - name: Assets
 *     description: Physical asset inventory (FKs to lookups by id)
 */

/**
 * @openapi
 * /asset/create-asset:
 *   post:
 *     tags: [Assets]
 *     summary: Create asset
 *     description: Stores `asset_type_id`, `asset_status_id`, and `asset_condition_id` as references to lookup tables.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetCreateBody'
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
 *                       $ref: '#/components/schemas/AssetRecord'
 *       400:
 *         description: Validation, duplicate serial, or invalid FK
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.post(
  "/create-asset",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.createAsset, "body"),
  assetController.createAsset
);

/**
 * @openapi
 * /asset/get-all-assets:
 *   get:
 *     tags: [Assets]
 *     summary: List all assets
 *     description: >
 *       Omit `asset_type` to return every asset. Pass `asset_type` as the lookup **name**
 *       (e.g. Laptop, Desktop) — match is case-insensitive. Sorted by `purchase_date` descending
 *       (missing dates last), then `created_at` descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: asset_type
 *         required: false
 *         schema:
 *           type: string
 *           example: Laptop
 *         description: Asset type name from `/asset-type/get-all-asset-types` (not an id).
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
 *                         $ref: '#/components/schemas/AssetRecord'
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.get(
  "/get-all-assets",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.getAllAssetsQuery, "query"),
  assetController.getAllAssets
);

/**
 * @openapi
 * /asset/{id}:
 *   get:
 *     tags: [Assets]
 *     summary: Get asset by id
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
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Assets]
 *     summary: Delete asset
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
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.getAsset, "params"),
  assetController.findAssetById
);

/**
 * @openapi
 * /asset:
 *   put:
 *     tags: [Assets]
 *     summary: Update asset
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetUpdateBody'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiEnvelope'
 *                 - type: object
 *                   properties:
 *                     result:
 *                       $ref: '#/components/schemas/AssetRecord'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.put(
  "/",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.putAsset, "body"),
  assetController.updateAsset
);

router.delete(
  "/:id",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.deleteAsset, "params"),
  assetController.deleteAsset
);

module.exports = router;
