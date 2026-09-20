// controllers/donor.controller.js
// Handles donor profiles, blood requests feed, donation responses, history using Mongoose

const mongoose = require('mongoose');
const {
  User,
  DonorProfile,
  ReceiverProfile,
  BloodRequest,
  DonorResponse,
  Notification,
  buildIdQuery,
} = require('../models');
const { sendDonorResponseAlert } = require('../services/email.service');

const urgencyOrder = { Critical: 1, High: 2, Medium: 3, Low: 4 };

// ════════════════════════════════════════════════════════════
// POST /api/donor/profile  — Create donor extra details
// Called after signup when user fills the extra details modal
// ════════════════════════════════════════════════════════════
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if already exists
    const existing = await DonorProfile.findOne({ user_id: userId });
    if (existing) {
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

    await DonorProfile.create({
      user_id:             userId,
      blood_group,
      date_of_birth,
      gender,
      weight_kg:           Number(weight_kg),
      phone,
      house_no:            house_no || null,
      street:              street || null,
      city,
      state,
      pincode,
      last_donation_date:  last_donation_date || null,
      is_first_time:       is_first_time !== undefined ? Boolean(is_first_time) : true,
      has_chronic_illness: Boolean(has_chronic_illness),
      on_medication:       Boolean(on_medication),
      tattoo_recent:       Boolean(tattoo_recent),
      is_available:        true,
      total_donations:     0,
    });

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

    const user = await User.findById(userId).select('full_name email');
    const profile = await DonorProfile.findOne({ user_id: userId });

    if (!profile) {
      return res.status(404).json({ message: 'Donor profile not found.', profileComplete: false });
    }

    const profileData = {
      ...profile.toObject(),
      full_name: user ? user.full_name : '',
      email:     user ? user.email : '',
    };

    return res.status(200).json({ profile: profileData });
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
    const fields = req.body;

    const updateData = {};
    const allowed = [
      'blood_group', 'date_of_birth', 'gender', 'weight_kg', 'phone',
      'house_no', 'street', 'city', 'state', 'pincode', 'last_donation_date',
      'is_first_time', 'has_chronic_illness', 'on_medication', 'tattoo_recent',
    ];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updateData[key] = fields[key];
      }
    }

    const updated = await DonorProfile.findOneAndUpdate(
      { user_id: userId },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
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
    await User.findByIdAndDelete(userId);
    await DonorProfile.deleteMany({ user_id: userId });
    await DonorResponse.deleteMany({ donor_id: userId });
    await Notification.deleteMany({ user_id: userId });
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

    const filter = { status: 'Open' };
    if (blood_group) filter.blood_group = blood_group;
    if (city)        filter.city = new RegExp(city, 'i');
    if (urgency)     filter.urgency = urgency;

    const requests = await BloodRequest.find(filter)
      .populate('receiver_id', 'full_name')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch receiver phones from receiver_profiles
    const receiverIds = requests.map(r => r.receiver_id?._id || r.receiver_id).filter(Boolean);
    const receiverProfiles = await ReceiverProfile.find({ user_id: { $in: receiverIds } })
      .select('user_id phone')
      .lean();

    const phoneMap = {};
    for (const rp of receiverProfiles) {
      phoneMap[rp.user_id.toString()] = rp.phone;
    }

    const formattedRequests = requests.map(br => {
      const recId = br.receiver_id?._id ? br.receiver_id._id.toString() : br.receiver_id?.toString();
      return {
        id:              br._id.toString(),
        blood_group:     br.blood_group,
        hospital_name:   br.hospital_name,
        city:            br.city,
        urgency:         br.urgency,
        units_needed:    br.units_needed,
        additional_note: br.additional_note,
        document_url:    br.document_url,
        status:          br.status,
        created_at:      br.createdAt,
        receiver_name:   br.receiver_id?.full_name || 'Receiver',
        receiver_phone:  phoneMap[recId] || '',
      };
    });

    // Sort by urgency priority (Critical -> High -> Medium -> Low)
    formattedRequests.sort((a, b) => {
      const uA = urgencyOrder[a.urgency] || 99;
      const uB = urgencyOrder[b.urgency] || 99;
      if (uA !== uB) return uA - uB;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return res.status(200).json({ requests: formattedRequests, total: formattedRequests.length });
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
    const query = buildIdQuery(id);

    const br = await BloodRequest.findOne(query)
      .populate('receiver_id', 'full_name')
      .lean();

    if (!br) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const recId = br.receiver_id?._id ? br.receiver_id._id.toString() : br.receiver_id?.toString();
    const rp = await ReceiverProfile.findOne({ user_id: recId }).select('phone').lean();

    const requestData = {
      id:              br._id.toString(),
      blood_group:     br.blood_group,
      hospital_name:   br.hospital_name,
      city:            br.city,
      urgency:         br.urgency,
      units_needed:    br.units_needed,
      additional_note: br.additional_note,
      document_url:    br.document_url,
      status:          br.status,
      created_at:      br.createdAt,
      receiver_name:   br.receiver_id?.full_name || 'Receiver',
      receiver_phone:  rp?.phone || '',
    };

    return res.status(200).json({ request: requestData });
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
    const reqDoc = await BloodRequest.findOne(buildIdQuery(requestId));
    if (!reqDoc) return res.status(404).json({ message: 'Request not found.' });
    if (reqDoc.status !== 'Open') return res.status(400).json({ message: 'This request is no longer open.' });

    // Check if already responded
    const existing = await DonorResponse.findOne({
      request_id: reqDoc._id,
      donor_id:   donorId,
    });
    if (existing) return res.status(409).json({ message: 'You already responded to this request.' });

    await DonorResponse.create({
      request_id:   reqDoc._id,
      donor_id:     donorId,
      message:      message || null,
      status:       'Pending',
      responded_at: new Date(),
    });

    // Create notification for receiver
    const donorUser = await User.findById(donorId).select('full_name email');
    const donorProfile = await DonorProfile.findOne({ user_id: donorId }).select('phone blood_group');
    const receiverUser = await User.findById(reqDoc.receiver_id).select('full_name email');

    await Notification.create({
      user_id: reqDoc.receiver_id,
      title:   'Donor responded to your request!',
      message: `${donorUser?.full_name || 'A donor'} has offered to donate blood for your request.`,
      type:    'response',
    });

    // Trigger Real-Time Email Alert to receiver
    sendDonorResponseAlert({
      receiverEmail:   receiverUser?.email,
      receiverName:    receiverUser?.full_name,
      donorName:       donorUser?.full_name,
      donorEmail:      donorUser?.email,
      donorPhone:      donorProfile?.phone,
      donorBloodGroup: donorProfile?.blood_group,
      hospitalName:    reqDoc.hospital_name,
      city:            reqDoc.city,
      message:         message,
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

    const responses = await DonorResponse.find({ donor_id: donorId })
      .populate({
        path: 'request_id',
        populate: { path: 'receiver_id', select: 'full_name' },
      })
      .sort({ responded_at: -1 })
      .lean();

    const history = responses.map(dr => {
      const br = dr.request_id || {};
      return {
        id:            dr._id.toString(),
        status:        dr.status,
        message:       dr.message,
        responded_at:  dr.responded_at,
        blood_group:   br.blood_group || '',
        hospital_name: br.hospital_name || '',
        city:          br.city || '',
        urgency:       br.urgency || '',
        receiver_name: br.receiver_id?.full_name || 'Receiver',
      };
    });

    return res.status(200).json({ history, total: history.length });
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

    const updated = await DonorProfile.findOneAndUpdate(
      { user_id: userId },
      { $set: { is_available: Boolean(is_available) } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Donor profile not found.' });
    }

    return res.status(200).json({
      message:      `You are now ${is_available ? 'available' : 'unavailable'} for donation.`,
      is_available: updated.is_available,
    });
  } catch (err) {
    console.error('toggleAvailability error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
