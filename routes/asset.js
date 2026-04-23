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

// IMPORTANT: literal paths (/import-template, /import) must be declared
// BEFORE the /:id routes below — Express matches routes in registration
// order, and /:id would otherwise greedily catch /import-template and fail
// Joi validation with "id must be a number".

/**
 * @openapi
 * /asset/import-template:
 *   get:
 *     tags: [Assets]
 *     summary: Download an xlsx template for bulk asset import
 *     description: >
 *       Returns an .xlsx file with the expected headers and 1-2 example rows.
 *       Users fill it out and upload via POST /asset/import.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: An xlsx file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get("/import-template", jwtMiddleware, assetController.downloadAssetTemplate);

/**
 * @openapi
 * /asset/import:
 *   post:
 *     tags: [Assets]
 *     summary: Bulk-import assets from an xlsx/csv file
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
router.post("/import", jwtMiddleware, assetController.importAssets);

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

/**
 * @openapi
 * /asset/{id}/retire:
 *   post:
 *     tags: [Assets]
 *     summary: Mark asset as end-of-life
 *     description: >
 *       Transitions the asset to the `retired` state, records the reason / retired_by,
 *       and clears any missing-asset metadata. Sets `asset_status_id` to the
 *       `retired` lookup row.
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
 *                 example: Hardware failure — battery swollen beyond repair
 *               retired_by:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Asset marked as end-of-life
 *       400:
 *         description: Already retired or validation error
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/retire",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.lifecycleParams, "params"),
  JoiMiddleWare(assetValidation.retireAssetBody, "body"),
  assetController.retireAsset
);

/**
 * @openapi
 * /asset/{id}/report-missing:
 *   post:
 *     tags: [Assets]
 *     summary: Report asset as missing / lost
 *     description: >
 *       Transitions the asset to the `missing` state, records the reason,
 *       optional last-known-location, and who reported it. Clears any
 *       end-of-life metadata. Sets `asset_status_id` to the `missing`
 *       lookup row.
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
 *                 example: Not returned after offboarding
 *               last_known_location:
 *                 type: string
 *                 nullable: true
 *                 example: Mumbai office · Desk 14
 *               reported_by:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Asset reported missing
 *       400:
 *         description: Already missing or validation error
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/report-missing",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.lifecycleParams, "params"),
  JoiMiddleWare(assetValidation.reportMissingBody, "body"),
  assetController.reportMissingAsset
);

/**
 * @openapi
 * /asset/{id}/maintenance:
 *   post:
 *     tags: [Assets]
 *     summary: Mark asset as under maintenance
 *     description: >
 *       Transitions the asset to `maintenance` state. Any active assignment is
 *       auto-closed. Fails if the asset is retired or missing.
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
 *                 example: Keyboard replacement + battery service
 *               reported_by:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Asset marked as under maintenance
 *       400:
 *         description: Already in maintenance / retired / missing
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/maintenance",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.lifecycleParams, "params"),
  JoiMiddleWare(assetValidation.maintenanceAssetBody, "body"),
  assetController.markMaintenanceAsset
);

/**
 * @openapi
 * /asset/{id}/restore:
 *   post:
 *     tags: [Assets]
 *     summary: Restore retired / missing asset to active
 *     description: >
 *       Clears retired and missing metadata and sets `asset_status_id` to the
 *       `active` lookup row. Fails if the asset is not currently retired or
 *       missing.
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
 *               restored_by:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Asset restored
 *       400:
 *         description: Asset is not retired or missing
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/restore",
  jwtMiddleware,
  JoiMiddleWare(assetValidation.lifecycleParams, "params"),
  JoiMiddleWare(assetValidation.restoreAssetBody, "body"),
  assetController.restoreAsset
);

module.exports = router;
