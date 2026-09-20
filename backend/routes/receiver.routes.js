// routes/receiver.routes.js — All receiver endpoints (JWT protected)

const express       = require('express');
const router        = express.Router();
const multer        = require('multer');
const receiverCtrl  = require('../controllers/receiver.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// Multer memory storage for prescription documents (10MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// All receiver routes require valid JWT + receiver role
router.use(verifyToken);
router.use(requireRole('receiver'));

// Profile CRUD
router.post  ('/profile',                       receiverCtrl.createProfile);        // POST   /api/receiver/profile
router.get   ('/profile',                       receiverCtrl.getProfile);           // GET    /api/receiver/profile
router.put   ('/profile',                       receiverCtrl.updateProfile);        // PUT    /api/receiver/profile
router.delete('/profile',                       receiverCtrl.deleteProfile);        // DELETE /api/receiver/profile

// Donor search (real-time data on receiver dashboard)
router.get   ('/donors',                        receiverCtrl.searchDonors);         // GET /api/receiver/donors

// Blood Requests CRUD & Verification Documents
router.post  ('/requests/upload-doc',           upload.single('document'), receiverCtrl.uploadMedicalDocument); // POST /api/receiver/requests/upload-doc
router.post  ('/requests',                      receiverCtrl.createRequest);        // POST   /api/receiver/requests
router.get   ('/requests',                      receiverCtrl.getMyRequests);        // GET    /api/receiver/requests
router.get   ('/incoming-responses',            receiverCtrl.getIncomingDonorResponses); // GET /api/receiver/incoming-responses
router.get   ('/requests/:id/responses',        receiverCtrl.getRequestResponses);  // GET    /api/receiver/requests/:id/responses
router.get   ('/requests/:id/matching-donors',  receiverCtrl.getMatchingDonors);    // GET    /api/receiver/requests/:id/matching-donors
router.post  ('/requests/:id/broadcast-email',  receiverCtrl.broadcastEmailToMatchingDonors); // POST /api/receiver/requests/:id/broadcast-email
router.post  ('/requests/:id/email-donor',      receiverCtrl.sendDirectEmailToDonor); // POST /api/receiver/requests/:id/email-donor
router.put   ('/requests/:id',                  receiverCtrl.updateRequest);        // PUT    /api/receiver/requests/:id
router.delete('/requests/:id',                  receiverCtrl.deleteRequest);        // DELETE /api/receiver/requests/:id

// Notifications
router.get   ('/notifications',                 receiverCtrl.getNotifications);     // GET /api/receiver/notifications

module.exports = router;
