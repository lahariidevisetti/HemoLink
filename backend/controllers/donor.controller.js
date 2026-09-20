const { pool } = require('../config/db');
const { sendDonorResponseAlert } = require('../services/email.service');

// ════════════════════════════════════════════════════════════
// POST /api/donor/profile  — Create donor extra details
// Called after signup when user fills the extra details modal
// ════════════════════════════════════════════════════════════
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if already exists
    const [existing] = await pool.query(
      'SELECT id FROM donor_profiles WHERE user_id = ?', [userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Donor profile already exists. Use PUT to update.' });
    }

    const {
      blood_group, date_of_birth, gender, weight_kg, phone,
      house_no, street, city, state, pincode,
      last_donation_date, is_first_time, has_chronic_illness,
      on_medication, tattoo_recent,
    } = req.body;

    // Required fields
    if (!blood_group || !date_of_birth || !gender || !weight_kg || !phone || !city || !state || !pincode) {
      return res.status(400).json({ message: 'Missing required donor profile fields.' });
    }

    await pool.query(
      `INSERT INTO donor_profiles
        (user_id, blood_group, date_of_birth, gender, weight_kg, phone,
         house_no, street, city, state, pincode, last_donation_date,
         is_first_time, has_chronic_illness, on_medication, tattoo_recent,
         is_available, total_donations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        userId, blood_group, date_of_birth, gender, weight_kg, phone,
        house_no || null, street || null, city, state, pincode,
        last_donation_date || null,
        is_first_time    ? 1 : 0,
        has_chronic_illness ? 1 : 0,
        on_medication    ? 1 : 0,
        tattoo_recent    ? 1 : 0,
      ]
    );

    return res.status(201).json({ message: 'Donor profile created successfully!' });
  } catch (err) {
    console.error('createDonorProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/donor/profile  — Read my donor profile
// ════════════════════════════════════════════════════════════
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT u.full_name, u.email, dp.*
       FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Donor profile not found.', profileComplete: false });
    }

    return res.status(200).json({ profile: rows[0] });
  } catch (err) {
    console.error('getDonorProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// PUT /api/donor/profile  — Update donor profile
// ════════════════════════════════════════════════════════════
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      blood_group, date_of_birth, gender, weight_kg, phone,
      house_no, street, city, state, pincode,
      last_donation_date, is_first_time, has_chronic_illness,
      on_medication, tattoo_recent,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE donor_profiles SET
        blood_group         = COALESCE(?, blood_group),
        date_of_birth       = COALESCE(?, date_of_birth),
        gender              = COALESCE(?, gender),
        weight_kg           = COALESCE(?, weight_kg),
        phone               = COALESCE(?, phone),
        house_no            = COALESCE(?, house_no),
        street              = COALESCE(?, street),
        city                = COALESCE(?, city),
        state               = COALESCE(?, state),
        pincode             = COALESCE(?, pincode),
        last_donation_date  = COALESCE(?, last_donation_date),
        is_first_time       = COALESCE(?, is_first_time),
        has_chronic_illness = COALESCE(?, has_chronic_illness),
        on_medication       = COALESCE(?, on_medication),
        tattoo_recent       = COALESCE(?, tattoo_recent)
       WHERE user_id = ?`,
      [
        blood_group, date_of_birth, gender, weight_kg, phone,
        house_no, street, city, state, pincode,
        last_donation_date,
        is_first_time !== undefined ? (is_first_time ? 1 : 0) : null,
        has_chronic_illness !== undefined ? (has_chronic_illness ? 1 : 0) : null,
        on_medication !== undefined ? (on_medication ? 1 : 0) : null,
        tattoo_recent !== undefined ? (tattoo_recent ? 1 : 0) : null,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Donor profile not found.' });
    }

    return res.status(200).json({ message: 'Donor profile updated successfully!' });
  } catch (err) {
    console.error('updateDonorProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// DELETE /api/donor/profile  — Delete donor account
// ════════════════════════════════════════════════════════════
exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // CASCADE in DB handles donor_profiles deletion
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return res.status(200).json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('deleteDonorProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/donor/requests  — All OPEN blood requests (real-time)
// Donors see requests from receivers — this is the main dashboard data
// ════════════════════════════════════════════════════════════
exports.getBloodRequests = async (req, res) => {
  try {
    const { blood_group, city, urgency } = req.query;

    let query = `
      SELECT
        br.id, br.blood_group, br.hospital_name, br.city,
        br.urgency, br.units_needed, br.additional_note,
        br.document_url,
        br.status, br.created_at,
        u.full_name AS receiver_name,
        rp.phone   AS receiver_phone
      FROM blood_requests br
      JOIN users u  ON u.id  = br.receiver_id
      JOIN receiver_profiles rp ON rp.user_id = br.receiver_id
      WHERE br.status = 'Open'
    `;
    const params = [];

    if (blood_group) { query += ' AND br.blood_group = ?'; params.push(blood_group); }
    if (city)        { query += ' AND br.city LIKE ?';     params.push(`%${city}%`); }
    if (urgency)     { query += ' AND br.urgency = ?';     params.push(urgency); }

    query += ' ORDER BY FIELD(br.urgency,"Critical","High","Medium","Low"), br.created_at DESC';

    const [rows] = await pool.query(query, params);

    return res.status(200).json({ requests: rows, total: rows.length });
  } catch (err) {
    console.error('getBloodRequests error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/donor/requests/:id — Fetch single request with document image
// ════════════════════════════════════════════════════════════
exports.getSingleBloodRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT
        br.id, br.blood_group, br.hospital_name, br.city,
        br.urgency, br.units_needed, br.additional_note,
        br.document_url,
        br.status, br.created_at,
        u.full_name AS receiver_name,
        rp.phone   AS receiver_phone
      FROM blood_requests br
      JOIN users u  ON u.id  = br.receiver_id
      JOIN receiver_profiles rp ON rp.user_id = br.receiver_id
      WHERE br.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    return res.status(200).json({ request: rows[0] });
  } catch (err) {
    console.error('getSingleBloodRequest error:', err);
    return res.status(500).json({ message: 'Server error retrieving request details.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/donor/respond/:requestId  — Donor responds to a request
// ════════════════════════════════════════════════════════════
exports.respondToRequest = async (req, res) => {
  try {
    const donorId   = req.user.id;
    const requestId = req.params.requestId;
    const { message } = req.body;

    // Check request exists and is open
    const [reqRows] = await pool.query(
      'SELECT id, status FROM blood_requests WHERE id = ?', [requestId]
    );
    if (reqRows.length === 0) return res.status(404).json({ message: 'Request not found.' });
    if (reqRows[0].status !== 'Open') return res.status(400).json({ message: 'This request is no longer open.' });

    // Check already responded
    const [existing] = await pool.query(
      'SELECT id FROM donor_responses WHERE request_id = ? AND donor_id = ?',
      [requestId, donorId]
    );
    if (existing.length > 0) return res.status(409).json({ message: 'You already responded to this request.' });

    await pool.query(
      'INSERT INTO donor_responses (request_id, donor_id, message) VALUES (?, ?, ?)',
      [requestId, donorId, message || null]
    );

    // Create notification for receiver
    const [reqDetails] = await pool.query(
      'SELECT receiver_id, hospital_name, city FROM blood_requests WHERE id = ?', [requestId]
    );
    const [donorUser] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [donorId]);
    const [donorProfile] = await pool.query('SELECT phone, blood_group FROM donor_profiles WHERE user_id = ?', [donorId]);
    const [receiverUser] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [reqDetails[0]?.receiver_id]);

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'response')`,
      [
        reqDetails[0].receiver_id,
        'Donor responded to your request!',
        `${donorUser[0].full_name} has offered to donate blood for your request.`,
      ]
    );

    // Trigger Real-Time Email Alert to receiver + admin email
    sendDonorResponseAlert({
      receiverEmail: receiverUser[0]?.email,
      receiverName: receiverUser[0]?.full_name,
      donorName: donorUser[0]?.full_name,
      donorEmail: donorUser[0]?.email,
      donorPhone: donorProfile[0]?.phone,
      donorBloodGroup: donorProfile[0]?.blood_group,
      hospitalName: reqDetails[0]?.hospital_name,
      city: reqDetails[0]?.city,
      message: message,
    }).catch(err => console.error('Email alert dispatch error:', err));

    return res.status(201).json({ message: 'Response sent successfully! The receiver will be notified.' });
  } catch (err) {
    console.error('respondToRequest error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/donor/history  — My donation history
// ════════════════════════════════════════════════════════════
exports.getHistory = async (req, res) => {
  try {
    const donorId = req.user.id;

    const [rows] = await pool.query(
      `SELECT
         dr.id, dr.status, dr.message, dr.responded_at,
         br.blood_group, br.hospital_name, br.city, br.urgency,
         u.full_name AS receiver_name
       FROM donor_responses dr
       JOIN blood_requests br ON br.id = dr.request_id
       JOIN users u           ON u.id  = br.receiver_id
       WHERE dr.donor_id = ?
       ORDER BY dr.responded_at DESC`,
      [donorId]
    );

    return res.status(200).json({ history: rows, total: rows.length });
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// PUT /api/donor/availability  — Toggle donor availability
// Body: { is_available: true/false }
// ════════════════════════════════════════════════════════════
exports.toggleAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_available } = req.body;

    await pool.query(
      'UPDATE donor_profiles SET is_available = ? WHERE user_id = ?',
      [is_available ? 1 : 0, userId]
    );

    return res.status(200).json({
      message:       `You are now ${is_available ? 'available' : 'unavailable'} for donation.`,
      is_available:  is_available,
    });
  } catch (err) {
    console.error('toggleAvailability error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
