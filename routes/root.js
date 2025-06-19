const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: 檢查服務狀態
 *     description: 返回服務狀態和版本資訊
 *     responses:
 *       200:
 *         description: 服務正常運行
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "running"
 *                 version:
 *                   type: string
 *                   example: "5.1.0"
 */
router.get('/', (req, res) => {
  res.json({
    status: 'running',
    version: process.env.npm_package_version || '5.1.0'
  });
});

module.exports = router; 
