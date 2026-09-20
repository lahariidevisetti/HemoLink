// routes/public.routes.js — Public, unauthenticated endpoints
const express = require('express');
const router  = express.Router();
const { pool } = require('../config/db');

// ════════════════════════════════════════════════════════════
// GET /api/public/requests/:id  — View blood request details publicly
// ════════════════════════════════════════════════════════════
router.get('/requests/:id', async (req, res) => {
  try {
    const requestId = req.params.id;

    const [rows] = await pool.query(
      `SELECT
        br.id,
        br.receiver_id,
        br.blood_group,
        br.hospital_name,
        br.city,
        br.urgency,
        br.units_needed,
        br.additional_note,
        br.document_url,
        br.status,
        br.created_at,
        u.full_name AS requester_name,
        rp.phone AS requester_phone,
        rp.address AS requester_address,
        (SELECT COUNT(*) FROM donor_responses dr WHERE dr.request_id = br.id) AS response_count
       FROM blood_requests br
       JOIN users u ON u.id = br.receiver_id
       LEFT JOIN receiver_profiles rp ON rp.user_id = u.id
       WHERE br.id = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const requestData = rows[0];

    return res.status(200).json({
      request: requestData,
    });
  } catch (err) {
    console.error('Public getRequestById error:', err);
    return res.status(500).json({ message: 'Server error retrieving request details.' });
  }
});

module.exports = router;
