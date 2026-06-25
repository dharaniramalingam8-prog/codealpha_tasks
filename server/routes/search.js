const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { globalSearch } = require('../controllers/searchController');

router.use(authenticateToken);

router.get('/', globalSearch);

module.exports = router;
