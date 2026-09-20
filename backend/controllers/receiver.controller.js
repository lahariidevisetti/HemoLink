// controllers/receiver.controller.js
// Handles receiver profiles, blood request creation, matching donors, responses, notifications via Mongoose

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
const { sendBloodRequestAlert, sendDirectMessageToDonor } = require('../services/email.service');
const { uploadDocument } = require('../services/cloudinary.service');
const { getEligibleDonorGroups, getCompatibilityType } = require('../utils/bloodCompatibility');

// ════════════════════════════════════════════════════════════
// POST /api/receiver/profile  — Create extra details
// ════════════════════════════════════════════════════════════
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const existing = await ReceiverProfile.findOne({ user_id: userId });
    if (existing) {
      return res.status(409).json({ message: 'Receiver profile already exists. Use PUT to update.' });
    }

    const { blood_group, date_of_birth, gender, phone, city, address } = req.body;

    if (!blood_group || !phone || !city) {
      return res.status(400).json({ message: 'Blood group, phone, and city are required.' });
    }

    await ReceiverProfile.create({
      user_id:       userId,
      blood_group,
      date_of_birth: date_of_birth || null,
      gender:        gender || null,
      phone,
      city,
      address:       address || null,
    });

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

    const user = await User.findById(userId).select('full_name email');
    const profile = await ReceiverProfile.findOne({ user_id: userId });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found.', profileComplete: false });
    }

    const profileData = {
      ...profile.toObject(),
      full_name: user ? user.full_name : '',
      email:     user ? user.email : '',
    };

    return res.status(200).json({ profile: profileData });
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

    const updateData = {};
    if (blood_group !== undefined)   updateData.blood_group = blood_group;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender !== undefined)        updateData.gender = gender;
    if (phone !== undefined)         updateData.phone = phone;
    if (city !== undefined)          updateData.city = city;
    if (address !== undefined)       updateData.address = address;

    const updated = await ReceiverProfile.findOneAndUpdate(
      { user_id: userId },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
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
    const userId = req.user.id;
    await User.findByIdAndDelete(userId);
    await ReceiverProfile.deleteMany({ user_id: userId });
    await BloodRequest.deleteMany({ receiver_id: userId });
    await Notification.deleteMany({ user_id: userId });
    return res.status(200).json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('deleteReceiverProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/donors  — Search available donors
// Query params: blood_group, city
// ════════════════════════════════════════════════════════════
exports.searchDonors = async (req, res) => {
  try {
    const { blood_group, city } = req.query;

    const filter = { is_available: true };
    if (blood_group) filter.blood_group = blood_group;
    if (city)        filter.city = new RegExp(city, 'i');

    const profiles = await DonorProfile.find(filter)
      .populate('user_id', 'full_name email role')
      .sort({ total_donations: -1 })
      .lean();

    const donors = profiles
      .filter(dp => dp.user_id && dp.user_id.role === 'donor')
      .map(dp => ({
        id:                 dp.user_id._id.toString(),
        full_name:          dp.user_id.full_name,
        email:              dp.user_id.email,
        blood_group:        dp.blood_group,
        city:               dp.city,
        state:              dp.state,
        phone:              dp.phone,
        total_donations:    dp.total_donations || 0,
        last_donation_date: dp.last_donation_date,
        is_available:       dp.is_available ? 1 : 0,
      }));

    return res.status(200).json({ donors, total: donors.length });
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

    const bloodReq = await BloodRequest.create({
      receiver_id:     receiverId,
      blood_group,
      hospital_name:   hospital_name.trim(),
      city:            city.trim(),
      urgency,
      units_needed:    Number(units_needed) || 1,
      additional_note: additional_note || null,
      document_url:    document_url || null,
      status:          'Open',
    });

    // Query matching & compatible available donors
    const eligibleGroups = getEligibleDonorGroups(blood_group);
    const donorProfiles = await DonorProfile.find({
      blood_group:  { $in: eligibleGroups },
      is_available: true,
    })
      .populate('user_id', 'full_name email role')
      .lean();

    const matchingDonors = donorProfiles
      .filter(dp => dp.user_id && dp.user_id.role === 'donor')
      .map(dp => ({
        user_id:     dp.user_id._id.toString(),
        email:       dp.user_id.email,
        full_name:   dp.user_id.full_name,
        blood_group: dp.blood_group,
      }));

    const receiverUser = await User.findById(receiverId).select('full_name email');
    const receiverName = receiverUser?.full_name || 'Receiver';

    if (matchingDonors.length > 0) {
      const notifs = matchingDonors.map(d => ({
        user_id: d.user_id,
        title:   'New Emergency Blood Request!',
        message: d.blood_group === blood_group
          ? `${receiverName} needs ${blood_group} blood at ${hospital_name}, ${city}. Urgency: ${urgency}.`
          : `${receiverName} needs ${blood_group} blood at ${hospital_name}, ${city}. Your ${d.blood_group} blood is medically compatible! Urgency: ${urgency}.`,
        type:    'request',
      }));
      await Notification.insertMany(notifs);
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
        bloodGroup:     blood_group,
        hospitalName:   hospital_name,
        city:           city,
        urgency:        urgency,
        unitsNeeded:    units_needed,
        additionalNote: compatNote
          ? (additional_note ? `${additional_note} · [${compatNote}]` : compatNote)
          : additional_note,
        receiverName:   receiverName,
        recipientEmail: donor.email.trim(),
        documentUrl:    document_url,
        actionUrl:      `${clientUrl}/request/${bloodReq._id.toString()}?donor_id=${donor.user_id}&action=review`,
      }).catch(err => console.error(`Email alert dispatch error for ${donor.email}:`, err.message));
    });

    return res.status(201).json({
      message:    'Blood request created! Matching donors have been notified.',
      request_id: bloodReq._id.toString(),
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

    const requests = await BloodRequest.find({ receiver_id: receiverId })
      .sort({ createdAt: -1 })
      .lean();

    const requestIds = requests.map(r => r._id);
    const responseCounts = await DonorResponse.aggregate([
      { $match: { request_id: { $in: requestIds } } },
      { $group: { _id: '$request_id', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    for (const item of responseCounts) {
      countMap[item._id.toString()] = item.count;
    }

    const formattedRequests = requests.map(br => ({
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
      response_count:  countMap[br._id.toString()] || 0,
    }));

    return res.status(200).json({ requests: formattedRequests, total: formattedRequests.length });
  } catch (err) {
    console.error('getMyRequests error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/requests/:id/responses  — Donors who responded to a request
// ════════════════════════════════════════════════════════════
exports.getRequestResponses = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const requestId  = req.params.id;

    const bloodReq = await BloodRequest.findOne({
      ...buildIdQuery(requestId),
      receiver_id: receiverId,
    });

    if (!bloodReq) return res.status(404).json({ message: 'Request not found.' });

    const responses = await DonorResponse.find({ request_id: bloodReq._id })
      .populate('donor_id', 'full_name email')
      .sort({ responded_at: -1 })
      .lean();

    const donorUserIds = responses.map(r => r.donor_id?._id || r.donor_id).filter(Boolean);
    const donorProfiles = await DonorProfile.find({ user_id: { $in: donorUserIds } }).lean();

    const dpMap = {};
    for (const dp of donorProfiles) {
      dpMap[dp.user_id.toString()] = dp;
    }

    const formattedResponses = responses.map(dr => {
      const dUserId = dr.donor_id?._id ? dr.donor_id._id.toString() : dr.donor_id?.toString();
      const dp = dpMap[dUserId] || {};
      return {
        id:              dr._id.toString(),
        donor_id:        dUserId,
        status:          dr.status,
        message:         dr.message,
        responded_at:    dr.responded_at,
        donor_name:      dr.donor_id?.full_name || 'Donor',
        donor_email:     dr.donor_id?.email || '',
        blood_group:     dp.blood_group || '',
        phone:           dp.phone || '',
        city:            dp.city || '',
        total_donations: dp.total_donations || 0,
      };
    });

    return res.status(200).json({ responses: formattedResponses, total: formattedResponses.length });
  } catch (err) {
    console.error('getRequestResponses error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/incoming-responses — Live deck across all requests
// ════════════════════════════════════════════════════════════
exports.getIncomingDonorResponses = async (req, res) => {
  try {
    const receiverId = req.user.id;

    const myRequests = await BloodRequest.find({ receiver_id: receiverId })
      .select('_id hospital_name city urgency blood_group')
      .lean();

    const reqMap = {};
    const reqIds = myRequests.map(r => {
      reqMap[r._id.toString()] = r;
      return r._id;
    });

    const responses = await DonorResponse.find({ request_id: { $in: reqIds } })
      .populate('donor_id', 'full_name email')
      .sort({ responded_at: -1 })
      .limit(10)
      .lean();

    const donorUserIds = responses.map(r => r.donor_id?._id || r.donor_id).filter(Boolean);
    const donorProfiles = await DonorProfile.find({ user_id: { $in: donorUserIds } }).lean();

    const dpMap = {};
    for (const dp of donorProfiles) {
      dpMap[dp.user_id.toString()] = dp;
    }

    const formatted = responses.map(dr => {
      const dUserId = dr.donor_id?._id ? dr.donor_id._id.toString() : dr.donor_id?.toString();
      const dp = dpMap[dUserId] || {};
      const br = reqMap[dr.request_id?.toString()] || {};

      return {
        id:                    dr._id.toString(),
        request_id:            dr.request_id?.toString(),
        status:                dr.status,
        message:               dr.message,
        responded_at:          dr.responded_at,
        donor_name:            dr.donor_id?.full_name || 'Donor',
        donor_email:           dr.donor_id?.email || '',
        donor_blood_group:     dp.blood_group || '',
        donor_phone:           dp.phone || '',
        donor_city:            dp.city || '',
        total_donations:       dp.total_donations || 0,
        hospital_name:         br.hospital_name || '',
        request_city:          br.city || '',
        urgency:               br.urgency || '',
        requested_blood_group: br.blood_group || '',
      };
    });

    return res.status(200).json({ responses: formatted, total: formatted.length });
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

    const updateData = {};
    if (hospital_name !== undefined)   updateData.hospital_name = hospital_name;
    if (city !== undefined)            updateData.city = city;
    if (urgency !== undefined)         updateData.urgency = urgency;
    if (units_needed !== undefined)    updateData.units_needed = units_needed;
    if (additional_note !== undefined) updateData.additional_note = additional_note;
    if (status !== undefined)          updateData.status = status;

    const updated = await BloodRequest.findOneAndUpdate(
      { ...buildIdQuery(requestId), receiver_id: receiverId },
      { $set: updateData },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Request not found.' });

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

    const deleted = await BloodRequest.findOneAndDelete({
      ...buildIdQuery(requestId),
      receiver_id: receiverId,
    });

    if (!deleted) return res.status(404).json({ message: 'Request not found.' });

    await DonorResponse.deleteMany({ request_id: deleted._id });

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

    const notifs = await Notification.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Mark all as read
    await Notification.updateMany({ user_id: userId, is_read: false }, { is_read: true });

    const formatted = notifs.map(n => ({
      id:         n._id.toString(),
      title:      n.title,
      message:    n.message,
      type:       n.type,
      is_read:    n.is_read ? 1 : 0,
      created_at: n.createdAt,
    }));

    return res.status(200).json({ notifications: formatted });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/receiver/requests/upload-doc — Upload Document
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
      message:  'Medical document uploaded successfully!',
      url:      result.url,
      provider: result.provider,
    });
  } catch (err) {
    console.error('uploadMedicalDocument error:', err);
    return res.status(500).json({ message: 'Failed to upload document: ' + err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/receiver/requests/:id/matching-donors — Fetch compatible donors
// ════════════════════════════════════════════════════════════
exports.getMatchingDonors = async (req, res) => {
  try {
    const requestId  = req.params.id;
    const receiverId = req.user.id;

    const bloodReq = await BloodRequest.findOne({
      ...buildIdQuery(requestId),
      receiver_id: receiverId,
    }).lean();

    if (!bloodReq) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const eligibleGroups = getEligibleDonorGroups(bloodReq.blood_group);

    // Query active donors with matching OR compatible blood groups
    const donorProfiles = await DonorProfile.find({
      blood_group:  { $in: eligibleGroups },
      is_available: true,
    })
      .populate('user_id', 'full_name email role')
      .lean();

    // Check which donors have already responded
    const responses = await DonorResponse.find({ request_id: bloodReq._id }).select('donor_id').lean();
    const respondedDonorSet = new Set(responses.map(r => r.donor_id.toString()));

    const activeDonors = donorProfiles
      .filter(dp => dp.user_id && dp.user_id.role === 'donor')
      .map(dp => {
        const uId = dp.user_id._id.toString();
        return {
          id:                uId,
          full_name:         dp.user_id.full_name,
          email:             dp.user_id.email,
          phone:             dp.phone,
          blood_group:       dp.blood_group,
          city:              dp.city,
          state:             dp.state,
          total_donations:   dp.total_donations || 0,
          is_available:      dp.is_available ? 1 : 0,
          has_responded:     respondedDonorSet.has(uId) ? 1 : 0,
          compatibilityType: getCompatibilityType(dp.blood_group, bloodReq.blood_group),
          isExactMatch:      dp.blood_group === bloodReq.blood_group,
        };
      });

    // Sort: Exact match first, then city match, then total_donations
    activeDonors.sort((a, b) => {
      if (a.isExactMatch !== b.isExactMatch) return b.isExactMatch ? 1 : -1;
      const cityMatchA = a.city?.toLowerCase() === bloodReq.city?.toLowerCase();
      const cityMatchB = b.city?.toLowerCase() === bloodReq.city?.toLowerCase();
      if (cityMatchA !== cityMatchB) return cityMatchB ? 1 : -1;
      return (b.total_donations || 0) - (a.total_donations || 0);
    });

    const requestFormatted = {
      id:              bloodReq._id.toString(),
      blood_group:     bloodReq.blood_group,
      hospital_name:   bloodReq.hospital_name,
      city:            bloodReq.city,
      urgency:         bloodReq.urgency,
      units_needed:    bloodReq.units_needed,
      additional_note: bloodReq.additional_note,
      document_url:    bloodReq.document_url,
      status:          bloodReq.status,
    };

    return res.status(200).json({
      request:        requestFormatted,
      eligibleGroups,
      matchingDonors: activeDonors,
      total:          activeDonors.length,
    });
  } catch (err) {
    console.error('getMatchingDonors error:', err);
    return res.status(500).json({ message: 'Server error retrieving matching donors.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/receiver/requests/:id/broadcast-email — Send All emergency emails
// ════════════════════════════════════════════════════════════
exports.broadcastEmailToMatchingDonors = async (req, res) => {
  try {
    const requestId  = req.params.id;
    const receiverId = req.user.id;
    const { donor_ids } = req.body;

    const bloodReq = await BloodRequest.findOne({
      ...buildIdQuery(requestId),
      receiver_id: receiverId,
    })
      .populate('receiver_id', 'full_name')
      .lean();

    if (!bloodReq) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const eligibleGroups = getEligibleDonorGroups(bloodReq.blood_group);

    const donorQuery = {
      blood_group:  { $in: eligibleGroups },
      is_available: true,
    };

    if (Array.isArray(donor_ids) && donor_ids.length > 0) {
      const validObjectIds = donor_ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      donorQuery.user_id = { $in: validObjectIds };
    }

    const donorProfiles = await DonorProfile.find(donorQuery)
      .populate('user_id', 'full_name email role')
      .lean();

    const donors = donorProfiles
      .filter(dp => dp.user_id && dp.user_id.role === 'donor')
      .map(dp => ({
        id:          dp.user_id._id.toString(),
        full_name:   dp.user_id.full_name,
        email:       dp.user_id.email,
        phone:       dp.phone,
        city:        dp.city,
        blood_group: dp.blood_group,
      }));

    if (donors.length === 0) {
      return res.status(400).json({
        message: `No active donors found for blood group ${bloodReq.blood_group} (or compatible ${eligibleGroups.join(', ')}).`,
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const requesterName = bloodReq.receiver_id?.full_name || 'Requester';

    const emailPromises = donors.map(donor => {
      const isExact = donor.blood_group === bloodReq.blood_group;
      const compatNote = isExact
        ? null
        : `Medical Compatibility: Patient needs ${bloodReq.blood_group}. Your ${donor.blood_group} blood is medically safe and compatible to donate.`;

      return sendBloodRequestAlert({
        bloodGroup:     bloodReq.blood_group,
        hospitalName:   bloodReq.hospital_name,
        city:           bloodReq.city,
        urgency:        bloodReq.urgency,
        unitsNeeded:    bloodReq.units_needed,
        additionalNote: compatNote
          ? (bloodReq.additional_note ? `${bloodReq.additional_note} · [${compatNote}]` : compatNote)
          : bloodReq.additional_note,
        receiverName:   requesterName,
        recipientEmail: donor.email,
        documentUrl:    bloodReq.document_url,
        actionUrl:      `${clientUrl}/request/${bloodReq._id.toString()}?donor_id=${donor.id}&action=review`,
      }).catch(err => console.error(`Failed sending to ${donor.email}:`, err.message));
    });

    await Promise.all(emailPromises);

    return res.status(200).json({
      message:    `Emergency broadcast emails sent successfully to ${donors.length} compatible donor(s) (${eligibleGroups.join(', ')})!`,
      sent_count: donors.length,
      eligibleGroups,
    });
  } catch (err) {
    console.error('broadcastEmailToMatchingDonors error:', err);
    return res.status(500).json({ message: 'Server error sending broadcast emails.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/receiver/requests/:id/email-donor — Send direct email to donor
// ════════════════════════════════════════════════════════════
exports.sendDirectEmailToDonor = async (req, res) => {
  try {
    const requestId  = req.params.id;
    const receiverId = req.user.id;
    const { donor_id, message: customMessage } = req.body;

    if (!donor_id) {
      return res.status(400).json({ message: 'donor_id is required.' });
    }

    const bloodReq = await BloodRequest.findOne({
      ...buildIdQuery(requestId),
      receiver_id: receiverId,
    })
      .populate('receiver_id', 'full_name email')
      .lean();

    if (!bloodReq) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const donorUser = await User.findById(donor_id).select('full_name email');
    const donorProfile = await DonorProfile.findOne({ user_id: donor_id }).select('phone city blood_group');

    if (!donorUser) {
      return res.status(404).json({ message: 'Donor not found.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const requesterName = bloodReq.receiver_id?.full_name || 'Requester';
    const requesterEmail = bloodReq.receiver_id?.email || '';

    await sendDirectMessageToDonor({
      donorName:      donorUser.full_name,
      donorEmail:     donorUser.email,
      requesterName:  requesterName,
      requesterEmail: requesterEmail,
      hospitalName:   bloodReq.hospital_name,
      city:           bloodReq.city,
      bloodGroup:     bloodReq.blood_group,
      requestId:      bloodReq._id.toString(),
      actionUrl:      `${clientUrl}/request/${bloodReq._id.toString()}?donor_id=${donorUser._id.toString()}&action=review`,
      customMessage:  customMessage || `Thank you for offering to donate blood for ${bloodReq.hospital_name}! Please coordinate with me directly.`,
    });

    await Notification.create({
      user_id: donorUser._id,
      title:   `Direct Message from ${requesterName} 🩸`,
      message: `${requesterName} sent you an emergency direct message regarding your donation offer for ${bloodReq.hospital_name}.`,
      type:    'request',
    });

    return res.status(200).json({
      success: true,
      message: `Direct email sent successfully to ${donorUser.full_name} (${donorUser.email})!`,
    });
  } catch (err) {
    console.error('sendDirectEmailToDonor error:', err);
    return res.status(500).json({ message: 'Server error sending direct email: ' + err.message });
  }
};
