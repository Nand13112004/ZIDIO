const express = require('express');
const router = express.Router();

/**
 * @route  GET /api/health
 * @desc   Health check - verify server and DB status
 * @access Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IntellMeet API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    version: '1.0.0',
  });
});

module.exports = router;
