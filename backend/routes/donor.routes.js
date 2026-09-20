// routes/donor.routes.js — All donor endpoints (JWT protected)

const express    = require('express');
const router     = express.Router();
const donorCtrl  = require('../controllers/donor.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// All donor routes require valid JWT + donor role
router.use(verifyToken);
router.use(requireRole('donor'));

// Profile CRUD
router.post  ('/profile',        donorCtrl.createProfile);    // POST   /api/donor/profile
router.get   ('/profile',        donorCtrl.getProfile);       // GET    /api/donor/profile
router.put   ('/profile',        donorCtrl.updateProfile);    // PUT    /api/donor/profile
router.delete('/profile',        donorCtrl.deleteProfile);    // DELETE /api/donor/profile

// Blood requests (real-time data shown on donor dashboard)
router.get   ('/requests',              donorCtrl.getBloodRequests);      // GET /api/donor/requests
router.get   ('/requests/:id',          donorCtrl.getSingleBloodRequest);  // GET /api/donor/requests/:id
router.post  ('/respond/:requestId',    donorCtrl.respondToRequest);      // POST /api/donor/respond/:id

// History & Availability
router.get   ('/history',              donorCtrl.getHistory);          // GET /api/donor/history
router.put   ('/availability',         donorCtrl.toggleAvailability);  // PUT /api/donor/availability

module.exports = router;
