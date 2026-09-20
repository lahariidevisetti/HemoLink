// controllers/auth.controller.js
// Handles signup, login, forgot-password, reset-password

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendWelcomeEmail, sendPasswordResetEmail, sendBloodRequestAlert } = require('../services/email.service');

// ─── Helper: generate JWT ────────────────────────────────────
function generateToken(user, profileComplete) {
  return jwt.sign(
    {
      id:              user.id,
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
  const table = role === 'donor' ? 'donor_profiles' : 'receiver_profiles';
  const [rows] = await pool.query(
    `SELECT id FROM ${table} WHERE user_id = ?`, [userId]
  );
  return rows.length > 0;
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

    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt          = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [full_name.trim(), email.toLowerCase().trim(), password_hash, role]
    );

    const newUser = {
      id:    result.insertId,
      email: email.toLowerCase().trim(),
      role:  role,
    };

    const token = generateToken(newUser, false); // profileComplete = false on signup

    // Send Welcome Email in background
    sendWelcomeEmail({
      name:  full_name.trim(),
      email: newUser.email,
      role:  role,
    }).catch(err => console.error('Welcome email error:', err));

    return res.status(201).json({
      message:         'Account created successfully!',
      token,
      user: {
        id:              newUser.id,
        full_name:       full_name.trim(),
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

    // Find user
    const [rows] = await pool.query(
      'SELECT id, full_name, email, password_hash, role FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if profile is complete
    const profileComplete = await isProfileComplete(user.id, user.role);

    const token = generateToken(user, profileComplete);

    return res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id:              user.id,
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
    const [rows] = await pool.query(
      'SELECT id, full_name FROM users WHERE email = ?', [normalizedEmail]
    );

    // If email doesn't exist, return neutral message for security
    if (rows.length === 0) {
      return res.status(200).json({ message: 'If this email exists, a verification code has been sent.' });
    }

    const userId   = rows[0].id;
    const userName = rows[0].full_name;

    // Invalidate any previously generated unused reset codes for this user
    await pool.query('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [userId]);

    // Generate a secure 6-digit verification code (e.g. 749201)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires   = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    // Save 6-digit code to DB
    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, resetCode, expires]
    );

    // Send Real-Time Crimson Email Template with 6-digit code
    sendPasswordResetEmail({
      email:     normalizedEmail,
      userName:  userName,
      resetCode: resetCode,
    }).catch(err => console.error('Reset email dispatch error:', err));

    console.log(`🔑 [SECURITY OTP] 6-digit password reset code for ${normalizedEmail}: ${resetCode}`);

    return res.status(200).json({
      message:   'A 6-digit verification code has been sent to your email.',
      resetCode: resetCode, // Available in response for instant local testing
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
    const [rows] = await pool.query(
      `SELECT pr.id, pr.user_id FROM password_resets pr
       WHERE pr.token = ? AND pr.expires_at > NOW() AND pr.used = 0`,
      [verificationCode]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
    }

    const resetRecordId = rows[0].id;
    const userId        = rows[0].user_id;

    // Hash new password
    const salt    = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update password + mark code as used
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecordId]);

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
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });

    const user            = rows[0];
    const profileComplete = await isProfileComplete(user.id, user.role);

    return res.status(200).json({
      user: { ...user, profileComplete },
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

