const express = require('express');
const router = express.Router();
const { checkHealth } = require('../services/songService');

router.get('/', async (req, res) => {
    try {
        const health = await checkHealth();
        res.json(health);
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

module.exports = router;
