const express = require("express");
const router = express.Router();

const assetTypeRoutes = require("./assetType");
const assetConditionRoutes = require("./assetCondition");
const assetStatusRoutes = require("./assetStatus");
const assetRoutes = require("./asset");
const userRoutes = require("./user");
const employeeRoutes = require("./employee");

router.use("/asset-type", assetTypeRoutes);
router.use("/asset-condition", assetConditionRoutes);
router.use("/asset-status", assetStatusRoutes);
router.use("/asset", assetRoutes);
router.use("/user", userRoutes);
router.use("/employee", employeeRoutes);

router.get("/health", (req, res) => {
  res.json({
    isSuccess: true,
    result: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    message: "Service is healthy",
    statusCode: 200,
  });
});

module.exports = router;
