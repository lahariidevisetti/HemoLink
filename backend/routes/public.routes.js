// routes/public.routes.js — Public, unauthenticated endpoints
const express = require('express');
const router  = express.Router();
const { BloodRequest, ReceiverProfile, DonorResponse, buildIdQuery } = require('../models');

// ════════════════════════════════════════════════════════════
// GET /api/public/requests/:id  — View blood request details publicly
// ════════════════════════════════════════════════════════════
router.get('/requests/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const query = buildIdQuery(requestId);

    const br = await BloodRequest.findOne(query)
      .populate('receiver_id', 'full_name')
      .lean();

    if (!br) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const recId = br.receiver_id?._id ? br.receiver_id._id.toString() : br.receiver_id?.toString();
    const rp = await ReceiverProfile.findOne({ user_id: recId }).select('phone address').lean();
    const responseCount = await DonorResponse.countDocuments({ request_id: br._id });

    const requestData = {
      id:                br._id.toString(),
      receiver_id:       recId,
      blood_group:       br.blood_group,
      hospital_name:     br.hospital_name,
      city:              br.city,
      urgency:           br.urgency,
      units_needed:      br.units_needed,
      additional_note:   br.additional_note,
      document_url:      br.document_url,
      status:            br.status,
      created_at:        br.createdAt,
      requester_name:    br.receiver_id?.full_name || 'Requester',
      requester_phone:   rp?.phone || '',
      requester_address: rp?.address || '',
      response_count:    responseCount,
    };

    return res.status(200).json({
      request: requestData,
    });
  } catch (err) {
    console.error('Public getRequestById error:', err);
    return res.status(500).json({ message: 'Server error retrieving request details.' });
  }
});

module.exports = router;
