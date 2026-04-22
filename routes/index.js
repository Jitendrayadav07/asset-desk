const express = require("express");
const router = express.Router();

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
