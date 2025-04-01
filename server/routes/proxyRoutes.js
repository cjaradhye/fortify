const express = require('express');
const router = express.Router();
const { fetchContract, getProgress } = require('../controllers/proxyController');

router.post('/fetch-contract', fetchContract);  // Fetch contract details
router.get('/status', getProgress);  // Check progress

module.exports = router;
