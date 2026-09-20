// routes/auth.routes.js

const express = require('express');
const router  = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// POST /api/auth/signup
router.post('/signup', authCtrl.signup);

// POST /api/auth/login
router.post('/login', authCtrl.login);

// POST /api/auth/forgot-password
router.post('/forgot-password', authCtrl.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authCtrl.resetPassword);

// GET  /api/auth/me  (protected)
router.get('/me', verifyToken, authCtrl.getMe);

// POST /api/auth/test-email (to verify email notifications)
router.post('/test-email', authCtrl.testEmail);

module.exports = router;
