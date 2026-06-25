const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  getDashboardStats,
  getReports,
  updateReportStatus,
  verifyUser
} = require('../controllers/adminController');

router.use(authenticateToken);
router.use(adminOnly);

router.get('/stats', getDashboardStats);
router.get('/reports', getReports);
router.patch('/reports/:id', updateReportStatus);
router.patch('/users/:id/verify', verifyUser);

module.exports = router;
