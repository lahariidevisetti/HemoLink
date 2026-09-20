// controllers/auth.controller.js
// Handles signup, login, forgot-password, reset-password using MongoDB Atlas & Mongoose

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { User, DonorProfile, ReceiverProfile, PasswordReset } = require('../models');
const { sendWelcomeEmail, sendPasswordResetEmail, sendBloodRequestAlert } = require('../services/email.service');

// ─── Helper: generate JWT ────────────────────────────────────
function generateToken(user, profileComplete) {
  return jwt.sign(
    {
      id:              user._id ? user._id.toString() : user.id,
      email:           user.email,
      role:            user.role,
      profileComplete: profileComplete,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// ─── Helper: check profile complete ─────────────────────────
async function isProfileComplete(userId, role) {
  try {
    if (role === 'donor') {
      const exists = await DonorProfile.exists({ user_id: userId });
      return exists !== null;
    } else {
      const exists = await ReceiverProfile.exists({ user_id: userId });
      return exists !== null;
    }
  } catch (err) {
    console.error('isProfileComplete error:', err);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// POST /api/auth/signup
// Body: { full_name, email, password, role }
// ════════════════════════════════════════════════════════════
exports.signup = async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    // Validate
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!['donor', 'receiver'].includes(role)) {
      return res.status(400).json({ message: 'Role must be donor or receiver.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt          = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      full_name: full_name.trim(),
      email: normalizedEmail,
      password_hash,
      role,
    });

    const token = generateToken(newUser, false); // profileComplete = false on signup

    // Send Welcome Email in background
    sendWelcomeEmail({
      name:  full_name.trim(),
      email: newUser.email,
      role:  role,
    }).catch(err => console.error('Welcome email error:', err));

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id:              newUser._id.toString(),
        full_name:       newUser.full_name,
        email:           newUser.email,
        role:            role,
        profileComplete: false,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error during signup.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/auth/login
// Body: { email, password }
// ════════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if profile is complete
    const profileComplete = await isProfileComplete(user._id, user.role);

    const token = generateToken(user, profileComplete);

    return res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id:              user._id.toString(),
        full_name:       user.full_name,
        email:           user.email,
        role:            user.role,
        profileComplete: profileComplete,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// Body: { email }
// ════════════════════════════════════════════════════════════
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // If email doesn't exist, return neutral message for security
    if (!user) {
      return res.status(200).json({ message: 'If this email exists, a verification code has been sent.' });
    }

    const userId   = user._id;
    const userName = user.full_name;

    // Invalidate any previously generated unused reset codes for this user
    await PasswordReset.updateMany({ user_id: userId, used: false }, { used: true });

    // Generate a secure 6-digit verification code (e.g. 749201)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires   = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    // Save 6-digit code to DB
    await PasswordReset.create({
      user_id: userId,
      token: resetCode,
      expires_at: expires,
    });

    // Send Real-Time Crimson Email Template with 6-digit code
    sendPasswordResetEmail({
      email:     normalizedEmail,
      userName:  userName,
      resetCode: resetCode,
    }).catch(err => console.error('Reset email dispatch error:', err));

    console.log(`🔑 [SECURITY OTP] 6-digit password reset code for ${normalizedEmail}: ${resetCode}`);

    return res.status(200).json({
      message:   'A 6-digit verification code has been sent to your email.',
      resetCode: resetCode,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// Body: { code (or token), newPassword }
// ════════════════════════════════════════════════════════════
exports.resetPassword = async (req, res) => {
  try {
    const { code, token, newPassword } = req.body;
    const verificationCode = (code || token || '').toString().trim();

    if (!verificationCode || !newPassword) {
      return res.status(400).json({ message: 'Verification code and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    // Find valid active code
    const resetRecord = await PasswordReset.findOne({
      token: verificationCode,
      expires_at: { $gt: new Date() },
      used: false,
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
    }

    const userId = resetRecord.user_id;

    // Hash new password
    const salt    = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update password + mark code as used
    await User.findByIdAndUpdate(userId, { password_hash: newHash });
    resetRecord.used = true;
    await resetRecord.save();

    console.log(`✅ Password successfully updated for user ID: ${userId}`);

    return res.status(200).json({ message: 'Password updated successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/auth/me  (verify token + return fresh user info)
// ════════════════════════════════════════════════════════════
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const profileComplete = await isProfileComplete(user._id, user.role);

    return res.status(200).json({
      user: {
        id:              user._id.toString(),
        full_name:       user.full_name,
        email:           user.email,
        role:            user.role,
        profileComplete,
      },
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/auth/test-email  — Send a test notification email
// Body: { targetEmail?: string }
// ════════════════════════════════════════════════════════════
exports.testEmail = async (req, res) => {
  const { targetEmail } = req.body;
  const recipient = targetEmail || process.env.ALERT_RECIPIENT_EMAIL || 'karumanchisubhash484@gmail.com';

  const result = await sendBloodRequestAlert({
    bloodGroup: 'O-',
    hospitalName: 'Apollo Speciality Hospital',
    city: 'Hyderabad',
    urgency: 'Critical',
    unitsNeeded: 2,
    additionalNote: 'Test Real-Time Notification from HemoLink platform!',
    receiverName: 'HemoLink System Test',
    recipientEmail: recipient,
  });

  if (result.success) {
    return res.status(200).json({
      message: `✅ Test email successfully sent to ${recipient}!`,
      messageId: result.messageId,
    });
  } else {
    return res.status(200).json({
      message: `⚠️ Email not delivered: ${result.reason || result.error}. Please check EMAIL_PASS in backend/.env`,
      details: result,
    });
  }
};
