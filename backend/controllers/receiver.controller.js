const { pool } = require('../config/db');
const { sendBloodRequestAlert, sendDirectMessageToDonor } = require('../services/email.service');
const { uploadDocument } = require('../services/cloudinary.service');
const { getEligibleDonorGroups, getCompatibilityType } = require('../utils/bloodCompatibility');

// ════════════════════════════════════════════════════════════
// POST /api/receiver/profile  — Create extra details (after signup warning banner)
// ════════════════════════════════════════════════════════════
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [existing] = await pool.query(
      'SELECT id FROM receiver_profiles WHERE user_id = ?', [userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Receiver profile already exists. Use PUT to update.' });
    }

    const { blood_group, date_of_birth, gender, phone, city, address } = req.body;

    if (!blood_group || !phone || !city) {
      return res.status(400).json({ message: 'Blood group, phone, and city are required.' });
    }

    await pool.query(
      `INSERT INTO receiver_profiles
         (user_id, blood_group, date_of_birth, gender, phone, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, blood_group,
        date_of_birth || null,
        gender        || null,
        phone, city,
        address       || null,
      ]
    );

    return res.status(201).json({ message: 'Receiver profile created successfully!' });
  } catch (err) {
    console.error('createReceiverProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/profile  — Read my profile
// ════════════════════════════════════════════════════════════
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT u.full_name, u.email, rp.*
       FROM receiver_profiles rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.', profileComplete: false });
    }

    return res.status(200).json({ profile: rows[0] });
  } catch (err) {
    console.error('getReceiverProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// PUT /api/receiver/profile  — Update receiver profile
// ════════════════════════════════════════════════════════════
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { blood_group, date_of_birth, gender, phone, city, address } = req.body;

    const [result] = await pool.query(
      `UPDATE receiver_profiles SET
         blood_group   = COALESCE(?, blood_group),
         date_of_birth = COALESCE(?, date_of_birth),
         gender        = COALESCE(?, gender),
         phone         = COALESCE(?, phone),
         city          = COALESCE(?, city),
         address       = COALESCE(?, address)
       WHERE user_id = ?`,
      [blood_group, date_of_birth, gender, phone, city, address, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Receiver profile not found.' });
    }

    return res.status(200).json({ message: 'Profile updated successfully!' });
  } catch (err) {
    console.error('updateReceiverProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// DELETE /api/receiver/profile  — Delete account
// ════════════════════════════════════════════════════════════
exports.deleteProfile = async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    return res.status(200).json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('deleteReceiverProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/donors  — Search available donors (real-time dashboard data)
// Query params: blood_group, city
// ════════════════════════════════════════════════════════════
exports.searchDonors = async (req, res) => {
  try {
    const { blood_group, city } = req.query;

    let query = `
      SELECT
        u.id, u.full_name,
        dp.blood_group, dp.city, dp.state,
        dp.phone, dp.total_donations,
        dp.last_donation_date, dp.is_available
      FROM donor_profiles dp
      JOIN users u ON u.id = dp.user_id
      WHERE dp.is_available = 1
    `;
    const params = [];

    if (blood_group) { query += ' AND dp.blood_group = ?';  params.push(blood_group); }
    if (city)        { query += ' AND dp.city LIKE ?';       params.push(`%${city}%`); }

    query += ' ORDER BY dp.total_donations DESC, u.full_name ASC';

    const [rows] = await pool.query(query, params);

    return res.status(200).json({ donors: rows, total: rows.length });
  } catch (err) {
    console.error('searchDonors error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/receiver/requests  — Create blood request
// ════════════════════════════════════════════════════════════
exports.createRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { blood_group, hospital_name, city, urgency, units_needed, additional_note, document_url } = req.body;

    if (!blood_group || !hospital_name || !city || !urgency) {
      return res.status(400).json({ message: 'Blood group, hospital, city, and urgency are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO blood_requests
         (receiver_id, blood_group, hospital_name, city, urgency, units_needed, additional_note, document_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiverId, blood_group, hospital_name, city, urgency, units_needed || 1, additional_note || null, document_url || null]
    );

    // Query matching & compatible available donors with contact info
    const eligibleGroups = getEligibleDonorGroups(blood_group);
    const [matchingDonors] = await pool.query(
      `SELECT dp.user_id, u.email, u.full_name, dp.blood_group
       FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.blood_group IN (?) AND dp.is_available = 1`,
      [eligibleGroups]
    );

    const [receiverUser] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [receiverId]);
    const receiverName = receiverUser[0]?.full_name || 'Receiver';

    if (matchingDonors.length > 0) {
      const notifValues = matchingDonors.map(d => [
        d.user_id,
        'New Emergency Blood Request!',
        d.blood_group === blood_group
          ? `${receiverName} needs ${blood_group} blood at ${hospital_name}, ${city}. Urgency: ${urgency}.`
          : `${receiverName} needs ${blood_group} blood at ${hospital_name}, ${city}. Your ${d.blood_group} blood is medically compatible! Urgency: ${urgency}.`,
        'request',
      ]);
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ?',
        [notifValues]
      );
    }

    // Trigger Real-Time Email Alert to each matching donor individually
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    matchingDonors.forEach(donor => {
      if (!donor.email) return;
      const isExact = donor.blood_group === blood_group;
      const compatNote = isExact
        ? null
        : `Medical Compatibility: Patient needs ${blood_group}. Your ${donor.blood_group} blood is medically safe and compatible to donate.`;

      sendBloodRequestAlert({
        bloodGroup: blood_group,
        hospitalName: hospital_name,
        city: city,
        urgency: urgency,
        unitsNeeded: units_needed,
        additionalNote: compatNote
          ? (additional_note ? `${additional_note} · [${compatNote}]` : compatNote)
          : additional_note,
        receiverName: receiverName,
        recipientEmail: donor.email.trim(),
        documentUrl: document_url,
        actionUrl: `${clientUrl}/request/${result.insertId}?donor_id=${donor.user_id}&action=review`,
      }).catch(err => console.error(`Email alert dispatch error for ${donor.email}:`, err.message));
    });

    return res.status(201).json({
      message:    'Blood request created! Matching donors have been notified.',
      request_id: result.insertId,
    });
  } catch (err) {
    console.error('createRequest error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/requests  — My blood requests + donor responses
// ════════════════════════════════════════════════════════════
exports.getMyRequests = async (req, res) => {
  try {
    const receiverId = req.user.id;

    const [requests] = await pool.query(
      `SELECT
         br.id, br.blood_group, br.hospital_name, br.city,
         br.urgency, br.units_needed, br.additional_note, br.document_url,
         br.status, br.created_at,
         COUNT(dr.id) AS response_count
       FROM blood_requests br
       LEFT JOIN donor_responses dr ON dr.request_id = br.id
       WHERE br.receiver_id = ?
       GROUP BY br.id
       ORDER BY br.created_at DESC`,
      [receiverId]
    );

    return res.status(200).json({ requests, total: requests.length });
  } catch (err) {
    console.error('getMyRequests error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/requests/:id/responses  — Donors who responded to a specific request
// ════════════════════════════════════════════════════════════
exports.getRequestResponses = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const requestId  = req.params.id;

    // Verify this request belongs to this receiver
    const [reqRows] = await pool.query(
      'SELECT id FROM blood_requests WHERE id = ? AND receiver_id = ?',
      [requestId, receiverId]
    );
    if (reqRows.length === 0) return res.status(404).json({ message: 'Request not found.' });

    const [responses] = await pool.query(
      `SELECT
         dr.id, dr.donor_id, dr.status, dr.message, dr.responded_at,
         u.full_name AS donor_name, u.email AS donor_email,
         dp.blood_group, dp.phone, dp.city, dp.total_donations
       FROM donor_responses dr
       JOIN users u         ON u.id  = dr.donor_id
       JOIN donor_profiles dp ON dp.user_id = dr.donor_id
       WHERE dr.request_id = ?
       ORDER BY dr.responded_at DESC`,
      [requestId]
    );

    return res.status(200).json({ responses, total: responses.length });
  } catch (err) {
    console.error('getRequestResponses error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/incoming-responses
// All incoming donor responses across all requests of this receiver
// ════════════════════════════════════════════════════════════
exports.getIncomingDonorResponses = async (req, res) => {
  try {
    const receiverId = req.user.id;

    const [responses] = await pool.query(
      `SELECT
         dr.id, dr.request_id, dr.status, dr.message, dr.responded_at,
         u.full_name AS donor_name, u.email AS donor_email,
         dp.blood_group AS donor_blood_group, dp.phone AS donor_phone, dp.city AS donor_city, dp.total_donations,
         br.hospital_name, br.city AS request_city, br.urgency, br.blood_group AS requested_blood_group
       FROM donor_responses dr
       JOIN blood_requests br ON br.id = dr.request_id
       JOIN users u           ON u.id  = dr.donor_id
       JOIN donor_profiles dp ON dp.user_id = dr.donor_id
       WHERE br.receiver_id = ?
       ORDER BY dr.responded_at DESC
       LIMIT 10`,
      [receiverId]
    );

    return res.status(200).json({ responses, total: responses.length });
  } catch (err) {
    console.error('getIncomingDonorResponses error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};


// ════════════════════════════════════════════════════════════
// PUT /api/receiver/requests/:id  — Update a blood request
// ════════════════════════════════════════════════════════════
exports.updateRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const requestId  = req.params.id;
    const { hospital_name, city, urgency, units_needed, additional_note, status } = req.body;

    const [result] = await pool.query(
      `UPDATE blood_requests SET
         hospital_name   = COALESCE(?, hospital_name),
         city            = COALESCE(?, city),
         urgency         = COALESCE(?, urgency),
         units_needed    = COALESCE(?, units_needed),
         additional_note = COALESCE(?, additional_note),
         status          = COALESCE(?, status)
       WHERE id = ? AND receiver_id = ?`,
      [hospital_name, city, urgency, units_needed, additional_note, status, requestId, receiverId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Request not found.' });

    return res.status(200).json({ message: 'Request updated.' });
  } catch (err) {
    console.error('updateRequest error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// DELETE /api/receiver/requests/:id  — Cancel/Delete a blood request
// ════════════════════════════════════════════════════════════
exports.deleteRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const requestId  = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM blood_requests WHERE id = ? AND receiver_id = ?',
      [requestId, receiverId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Request not found.' });

    return res.status(200).json({ message: 'Blood request cancelled.' });
  } catch (err) {
    console.error('deleteRequest error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/notifications  — Get my notifications
// ════════════════════════════════════════════════════════════
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    // Mark all as read
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);

    return res.status(200).json({ notifications: rows });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/receiver/requests/upload-doc — Upload Doctor/Operation Document
// ════════════════════════════════════════════════════════════
exports.uploadMedicalDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please select a prescription or medical document.' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const result = await uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      host
    );

    return res.status(200).json({
      message: 'Medical document uploaded successfully!',
      url: result.url,
      provider: result.provider,
    });
  } catch (err) {
    console.error('uploadMedicalDocument error:', err);
    return res.status(500).json({ message: 'Failed to upload document: ' + err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/requests/:id/matching-donors — Fetch matching & compatible donors
// ════════════════════════════════════════════════════════════
exports.getMatchingDonors = async (req, res) => {
  try {
    const requestId = req.params.id;
    const receiverId = req.user.id;

    const [reqRows] = await pool.query(
      'SELECT id, blood_group, city, hospital_name, units_needed, urgency FROM blood_requests WHERE id = ? AND receiver_id = ?',
      [requestId, receiverId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const request = reqRows[0];
    const eligibleGroups = getEligibleDonorGroups(request.blood_group);

    // Query registered active donors with matching OR compatible blood groups
    const [donors] = await pool.query(
      `SELECT
         u.id, u.full_name, u.email,
         dp.phone, dp.blood_group, dp.city, dp.state, dp.total_donations, dp.is_available,
         (SELECT COUNT(*) FROM donor_responses WHERE request_id = ? AND donor_id = u.id) AS has_responded
       FROM users u
       JOIN donor_profiles dp ON dp.user_id = u.id
       WHERE u.role = 'donor'
         AND dp.blood_group IN (?)
         AND dp.is_available = 1
       ORDER BY (dp.blood_group = ?) DESC, (dp.city = ?) DESC, dp.total_donations DESC`,
      [requestId, eligibleGroups, request.blood_group, request.city]
    );

    const enrichedDonors = donors.map(d => ({
      ...d,
      compatibilityType: getCompatibilityType(d.blood_group, request.blood_group),
      isExactMatch: d.blood_group === request.blood_group,
    }));

    return res.status(200).json({
      request,
      eligibleGroups,
      matchingDonors: enrichedDonors,
      total: enrichedDonors.length,
    });
  } catch (err) {
    console.error('getMatchingDonors error:', err);
    return res.status(500).json({ message: 'Server error retrieving matching donors.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/receiver/requests/:id/broadcast-email — Send All emergency emails to compatible donors
// ════════════════════════════════════════════════════════════
exports.broadcastEmailToMatchingDonors = async (req, res) => {
  try {
    const requestId = req.params.id;
    const receiverId = req.user.id;
    const { donor_ids } = req.body;

    const [reqRows] = await pool.query(
      `SELECT br.*, u.full_name AS requester_name, rp.phone AS requester_phone
       FROM blood_requests br
       JOIN users u ON u.id = br.receiver_id
       LEFT JOIN receiver_profiles rp ON rp.user_id = u.id
       WHERE br.id = ? AND br.receiver_id = ?`,
      [requestId, receiverId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const bloodReq = reqRows[0];
    const eligibleGroups = getEligibleDonorGroups(bloodReq.blood_group);

    let donorQuery = `
      SELECT u.id, u.full_name, u.email, dp.phone, dp.city, dp.blood_group
      FROM users u
      JOIN donor_profiles dp ON dp.user_id = u.id
      WHERE u.role = 'donor'
        AND dp.blood_group IN (?)
        AND dp.is_available = 1
    `;
    const donorParams = [eligibleGroups];

    if (Array.isArray(donor_ids) && donor_ids.length > 0) {
      donorQuery += ' AND u.id IN (?)';
      donorParams.push(donor_ids);
    }

    const [donors] = await pool.query(donorQuery, donorParams);

    if (donors.length === 0) {
      return res.status(400).json({
        message: `No active donors found for blood group ${bloodReq.blood_group} (or compatible ${eligibleGroups.join(', ')}).`,
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Dispatch emails to all matching and compatible donors asynchronously
    const emailPromises = donors.map(donor => {
      const isExact = donor.blood_group === bloodReq.blood_group;
      const compatNote = isExact
        ? null
        : `Medical Compatibility: Patient needs ${bloodReq.blood_group}. Your ${donor.blood_group} blood is medically safe and compatible to donate.`;

      return sendBloodRequestAlert({
        bloodGroup: bloodReq.blood_group,
        hospitalName: bloodReq.hospital_name,
        city: bloodReq.city,
        urgency: bloodReq.urgency,
        unitsNeeded: bloodReq.units_needed,
        additionalNote: compatNote
          ? (bloodReq.additional_note ? `${bloodReq.additional_note} · [${compatNote}]` : compatNote)
          : bloodReq.additional_note,
        receiverName: bloodReq.requester_name,
        recipientEmail: donor.email,
        documentUrl: bloodReq.document_url,
        actionUrl: `${clientUrl}/request/${bloodReq.id}?donor_id=${donor.id}&action=review`,
      }).catch(err => console.error(`Failed sending to ${donor.email}:`, err.message));
    });

    await Promise.all(emailPromises);

    return res.status(200).json({
      message: `Emergency broadcast emails sent successfully to ${donors.length} compatible donor(s) (${eligibleGroups.join(', ')})!`,
      sent_count: donors.length,
      eligibleGroups,
    });
  } catch (err) {
    console.error('broadcastEmailToMatchingDonors error:', err);
    return res.status(500).json({ message: 'Server error sending broadcast emails.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/receiver/requests/:id/email-donor — Send direct email to a responded donor
// ════════════════════════════════════════════════════════════
exports.sendDirectEmailToDonor = async (req, res) => {
  try {
    const requestId  = req.params.id;
    const receiverId = req.user.id;
    const { donor_id, message: customMessage } = req.body;

    if (!donor_id) {
      return res.status(400).json({ message: 'donor_id is required.' });
    }

    // Verify request ownership
    const [reqRows] = await pool.query(
      `SELECT br.*, u.full_name AS requester_name, u.email AS requester_email, rp.phone AS requester_phone
       FROM blood_requests br
       JOIN users u ON u.id = br.receiver_id
       LEFT JOIN receiver_profiles rp ON rp.user_id = u.id
       WHERE br.id = ? AND br.receiver_id = ?`,
      [requestId, receiverId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const bloodReq = reqRows[0];

    // Get donor user info
    const [donorRows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, dp.phone, dp.city, dp.blood_group
       FROM users u
       JOIN donor_profiles dp ON dp.user_id = u.id
       WHERE u.id = ?`,
      [donor_id]
    );

    if (donorRows.length === 0) {
      return res.status(404).json({ message: 'Donor not found.' });
    }

    const donor = donorRows[0];

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Send direct email via email service
    await sendDirectMessageToDonor({
      donorName: donor.full_name,
      donorEmail: donor.email,
      requesterName: bloodReq.requester_name,
      requesterEmail: bloodReq.requester_email,
      hospitalName: bloodReq.hospital_name,
      city: bloodReq.city,
      bloodGroup: bloodReq.blood_group,
      requestId: bloodReq.id,
      actionUrl: `${clientUrl}/request/${bloodReq.id}?donor_id=${donor.id}&action=review`,
      customMessage: customMessage || `Thank you for offering to donate blood for ${bloodReq.hospital_name}! Please coordinate with me directly.`,
    });

    // Also record in-app notification for the donor
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'request')`,
      [
        donor.id,
        `Direct Message from ${bloodReq.requester_name} 🩸`,
        `${bloodReq.requester_name} sent you an emergency direct message regarding your donation offer for ${bloodReq.hospital_name}.`,
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Direct email sent successfully to ${donor.full_name} (${donor.email})!`,
    });
  } catch (err) {
    console.error('sendDirectEmailToDonor error:', err);
    return res.status(500).json({ message: 'Server error sending direct email: ' + err.message });
  }
};

