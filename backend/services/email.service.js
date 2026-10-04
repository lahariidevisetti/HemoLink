// services/email.service.js
// Real-time email notification service using Brevo Transactional Email REST API v3

require('dotenv').config();

/**
 * Retrieves the Brevo API Key strictly from process.env.BREVO_API_KEY.
 */
function getBrevoApiKey() {
  const key = process.env.BREVO_API_KEY;
  if (!key || key === 'your_brevo_api_key_here') {
    return null;
  }
  return key.trim();
}

/**
 * Retrieves the configured sender email strictly from process.env.SENDER_EMAIL.
 */
function getSenderEmail() {
  const email = process.env.SENDER_EMAIL;
  if (!email || email === 'your_verified_sender@domain.com') {
    return null;
  }
  return email.toLowerCase().trim();
}

/**
 * Retrieves the configured sender display name from process.env.SENDER_NAME.
 */
function getSenderName() {
  return process.env.SENDER_NAME || 'HemoLink Blood Platform 🩸';
}

/**
 * Retrieves the base frontend client URL from process.env.CLIENT_URL.
 */
function getClientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

/**
 * Safely sends email via Brevo Transactional Email REST API v3.
 * Prevents email errors from crashing HTTP request handlers.
 */
async function sendMailSafely({ to, subject, html, text }) {
  if (!to) {
    return { success: false, reason: 'No recipient email provided' };
  }

  const apiKey = getBrevoApiKey();
  const senderEmail = getSenderEmail();
  const senderName = getSenderName();

  if (!apiKey) {
    console.log(`[EMAIL NOTICE] Email to <${to}> skipped. BREVO_API_KEY is not configured.`);
    console.log(`[EMAIL PREVIEW] Subject: ${subject}`);
    return { success: false, reason: 'BREVO_API_KEY not configured' };
  }

  if (!senderEmail) {
    console.log(`[EMAIL NOTICE] Email to <${to}> skipped. SENDER_EMAIL is not configured.`);
    console.log(`[EMAIL PREVIEW] Subject: ${subject}`);
    return { success: false, reason: 'SENDER_EMAIL not configured' };
  }

  // Sanitize and format recipient(s)
  const recipientList = (Array.isArray(to) ? to : String(to).split(','))
    .map(e => e.trim())
    .filter(Boolean);

  if (recipientList.length === 0) {
    return { success: false, reason: 'No valid recipient email address' };
  }

  try {
    const brevoPayload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: recipientList.map(email => ({ email })),
      subject: subject,
      htmlContent: html,
      textContent: text || subject,
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(brevoPayload),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && (data.messageId || data.messageIds)) {
      const messageId = data.messageId || (data.messageIds && data.messageIds[0]);
      console.log(`✅ [BREVO SENT] Message ID: ${messageId} to ${recipientList.join(', ')}`);
      return { success: true, messageId };
    }

    console.error(`❌ [BREVO API ERROR] HTTP ${response.status}: ${data.message || JSON.stringify(data)}`);
    return { success: false, error: data.message || `Brevo API error (HTTP ${response.status})` };
  } catch (err) {
    console.error(`❌ [BREVO NETWORK ERROR] Failed sending to ${recipientList.join(', ')}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════
// 1. Blood Request Alert (Sent to matching donors & alert email)
// ════════════════════════════════════════════════════════════
async function sendBloodRequestAlert({
  bloodGroup,
  hospitalName,
  city,
  urgency,
  unitsNeeded,
  additionalNote,
  receiverName,
  recipientEmail,
  documentUrl,
  actionUrl,
}) {
  if (!recipientEmail) {
    return { success: false, reason: 'No recipient email provided' };
  }

  const senderEmail = getSenderEmail();
  if (!senderEmail) {
    return { success: false, reason: 'SENDER_EMAIL not configured' };
  }

  // If multiple emails are passed (array or comma-separated string), dispatch individually
  const emailList = (Array.isArray(recipientEmail) ? recipientEmail : String(recipientEmail).split(','))
    .map(e => e.trim())
    .filter(e => e && e.toLowerCase() !== senderEmail);

  if (emailList.length === 0) {
    console.log('[EMAIL NOTICE] No external donor recipients to send to.');
    return { success: false, reason: 'No valid recipient email after filtering sender' };
  }

  // If multiple recipients exist, recurse individually so every donor gets their own email with ONLY their email in 'To'
  if (emailList.length > 1) {
    const promises = emailList.map(singleEmail =>
      sendBloodRequestAlert({
        bloodGroup,
        hospitalName,
        city,
        urgency,
        unitsNeeded,
        additionalNote,
        receiverName,
        recipientEmail: singleEmail,
        documentUrl,
        actionUrl,
      })
    );
    const results = await Promise.all(promises);
    return { success: true, count: results.length };
  }

  const recipients = emailList[0];

  const urgencyBadgeColor =
    urgency === 'Critical' ? '#dc2626' : urgency === 'High' ? '#ea580c' : '#d97706';

  const clientUrl = getClientUrl();
  const finalActionUrl = actionUrl || `${clientUrl}/donor/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin:0; padding:24px;">
      <div style="max-width: 580px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #fee2e2;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b91c1c, #dc2626); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px;">🩸 Urgent Blood Request</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Someone urgently requires blood matching your profile</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="display: inline-block; background: #fef2f2; color: #dc2626; font-size: 32px; font-weight: 800; padding: 8px 24px; border-radius: 12px; border: 2px solid #fca5a5;">
              ${bloodGroup} Needed
            </span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Urgency Level:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
                <span style="background: ${urgencyBadgeColor}; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${urgency}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Hospital / Clinic:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #111827;">${hospitalName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Location / City:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #111827;">${city}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Units Required:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #111827;">${unitsNeeded || 1} Unit(s)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Requested By:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #111827;">${receiverName || 'Registered Receiver'}</td>
            </tr>
            ${additionalNote ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Patient Note:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #4b5563; font-style: italic;">"${additionalNote}"</td>
            </tr>
            ` : ''}
            ${documentUrl ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #16a34a; font-weight: bold;">Medical Document:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
                <a href="${documentUrl}" target="_blank" style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-decoration: none;">
                  🩺 View Doctor Prescription / Surgery Docs ↗
                </a>
              </td>
            </tr>
            ` : ''}
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${finalActionUrl}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
              🚨 Review Emergency Details & Respond Now →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
          HemoLink Real-Time Blood Donation Platform · Sent automatically to notify eligible donors.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafely({
    to: recipients,
    subject: `🚨 Urgent Blood Request [${bloodGroup}] at ${hospitalName} (${city})`,
    html,
  });
}

// ════════════════════════════════════════════════════════════
// 2. Donor Response Alert (Sent to receiver who created the broadcast)
// ════════════════════════════════════════════════════════════
async function sendDonorResponseAlert({
  receiverEmail,
  receiverName,
  donorName,
  donorPhone,
  donorBloodGroup,
  donorEmail,
  hospitalName,
  city,
  message,
}) {
  if (!receiverEmail) {
    return { success: false, reason: 'No receiver email provided' };
  }
  const recipients = receiverEmail;
  const clientUrl = getClientUrl();

  const cleanPhone = donorPhone ? donorPhone.replace(/\D/g, '') : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin:0; padding:24px;">
      <div style="max-width: 580px; margin: auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.09); border: 1.5px solid #86efac;">
        
        <!-- Celebratory Header -->
        <div style="background: linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%); padding: 26px 24px; text-align: center; color: #ffffff;">
          <div style="font-size: 34px; margin-bottom: 6px;">🎉</div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.3px;">A Donor Has Accepted Your Request!</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.95; font-weight: 600;">
            ${donorName} wants to donate blood for ${hospitalName}
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 26px;">
          <p style="font-size: 15px; color: #1f2937; margin-top: 0; line-height: 1.5;">
            Hello <strong>${receiverName || 'Requester'}</strong>,
          </p>
          <p style="font-size: 14.5px; color: #374151; line-height: 1.6;">
            Great news! <strong>${donorName}</strong> has reviewed your emergency blood broadcast on HemoLink and <strong>accepted to donate blood</strong> for <strong>${hospitalName} (${city})</strong>.
          </p>

          <!-- Donor Details Box -->
          <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(16, 185, 129, 0.08);">
            <p style="margin: 0 0 12px; font-weight: 900; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
              🩸 Donor Details & Contact Information:
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #4b5563; font-weight: bold; width: 140px;">Donor Name:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #111827;">${donorName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4b5563; font-weight: bold;">Blood Group:</td>
                <td style="padding: 6px 0;">
                  <span style="background: #fee2e2; color: #dc2626; padding: 3px 10px; border-radius: 6px; font-weight: 800; border: 1px solid #fca5a5;">
                    ${donorBloodGroup || 'Compatible Match'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4b5563; font-weight: bold;">Contact Phone:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #059669;">
                  ${donorPhone ? `<a href="tel:${donorPhone}" style="color: #059669; text-decoration: none; font-size: 16px;">📞 ${donorPhone}</a>` : 'Shared on platform'}
                </td>
              </tr>
              ${donorEmail ? `
              <tr>
                <td style="padding: 6px 0; color: #4b5563; font-weight: bold;">Donor Email:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 600;">${donorEmail}</td>
              </tr>` : ''}
              ${message ? `
              <tr>
                <td style="padding: 6px 0; color: #4b5563; font-weight: bold; vertical-align: top;">Donor Note / ETA:</td>
                <td style="padding: 6px 0; color: #065f46; font-style: italic; font-weight: 600;">"${message}"</td>
              </tr>` : ''}
            </table>
          </div>

          <p style="font-size: 14px; color: #1f2937; font-weight: 700; text-align: center; margin: 18px 0 10px;">
            ⚡ Please contact <strong>${donorName}</strong> directly to coordinate arrival at the hospital:
          </p>

          <!-- Action Buttons for Receiver -->
          <div style="text-align: center; margin-top: 18px; margin-bottom: 8px;">
            ${donorPhone ? `
            <a href="tel:${donorPhone}" style="background: #16a34a; color: #ffffff; text-decoration: none; padding: 13px 22px; border-radius: 8px; font-weight: 800; font-size: 14px; display: inline-block; margin: 4px; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.3);">
              📞 Call ${donorName}
            </a>` : ''}
            ${cleanPhone ? `
            <a href="https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(donorName)}%2C%20thank%20you%20for%20accepting%20my%20blood%20request%20for%20${encodeURIComponent(hospitalName)}!" style="background: #25d366; color: #ffffff; text-decoration: none; padding: 13px 20px; border-radius: 8px; font-weight: 800; font-size: 14px; display: inline-block; margin: 4px;">
              💬 WhatsApp
            </a>` : ''}
            <a href="${clientUrl}/receiver/requests" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 13px 22px; border-radius: 8px; font-weight: 800; font-size: 14px; display: inline-block; margin: 4px; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3);">
              🩸 View in Dashboard →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
          HemoLink Real-Time Blood Donation Platform · Notification sent directly to broadcast creator.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafely({
    to: recipients,
    subject: `🎉 ${donorName} Accepted Your Blood Request! Ready to donate ${donorBloodGroup || 'blood'} for ${hospitalName}`,
    html,
  });
}

// ════════════════════════════════════════════════════════════
// 3. Welcome Email
// ════════════════════════════════════════════════════════════
async function sendWelcomeEmail({ name, email, role }) {
  if (!email) {
    return { success: false, reason: 'No email provided for welcome email' };
  }
  const recipients = email;
  const clientUrl = getClientUrl();

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin:0; padding:24px;">
      <div style="max-width: 580px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #111827; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; color:#f87171;">🩸 Welcome to HemoLink</h1>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: #111827; margin-top:0;">Welcome, ${name}!</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            Thank you for registering as a <strong>${role.toUpperCase()}</strong> on HemoLink.
            ${role === 'donor'
              ? 'Your willingness to donate blood helps save precious lives in emergency situations.'
              : 'Our real-time network connects you directly with nearby donors whenever urgent blood is needed.'}
          </p>
          <p style="color: #4b5563; font-size: 14px;">
            Please log in and complete your profile details to ensure full real-time matching.
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${clientUrl}/login" style="background: #dc2626; color: #fff; padding: 11px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Go to HemoLink
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafely({
    to: recipients,
    subject: `🩸 Welcome to HemoLink, ${name}!`,
    html,
  });
}

// ════════════════════════════════════════════════════════════
// 4. Password Reset Code Email (6-Digit OTP & Crimson Template)
// ════════════════════════════════════════════════════════════
async function sendPasswordResetEmail({ email, userName, resetCode }) {
  if (!email) {
    return { success: false, reason: 'No email provided for password reset' };
  }
  const recipients = email;
  const clientUrl = getClientUrl();
  const directLink = `${clientUrl}/reset-password?code=${resetCode}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0103; margin: 0; padding: 32px 16px;">
      <div style="max-width: 560px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 35px rgba(220, 38, 38, 0.25); border: 2px solid #fee2e2;">
        
        <!-- Header: Deep Crimson Gradient -->
        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <div style="font-size: 36px; line-height: 1; margin-bottom: 8px;">🩸</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">HemoLink Security</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.92; font-weight: 500;">Password Reset Verification Code</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 28px;">
          <p style="font-size: 16px; color: #111827; margin: 0 0 12px; font-weight: 700;">
            Hello ${userName || 'Hero'},
          </p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
            We received a request to reset the password for your HemoLink account (<strong style="color: #111827;">${email}</strong>). Use the 6-digit verification code below to authorize this change:
          </p>

          <!-- 6-Digit Code Box: Crimson Border & Glow -->
          <div style="background: #fef2f2; border: 2.5px dashed #dc2626; border-radius: 14px; padding: 22px 16px; text-align: center; margin: 0 0 24px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #991b1b;">
              Your Verification Code
            </p>
            <div style="font-size: 40px; font-weight: 900; letter-spacing: 14px; color: #b91c1c; font-family: 'Courier New', Courier, monospace; padding: 8px 0; margin-left: 14px;">
              ${resetCode}
            </div>
            <p style="margin: 6px 0 0; font-size: 12px; color: #6b7280; font-weight: 600;">
              ⏱️ Valid for 15 minutes · Do not disclose this code to anyone
            </p>
          </div>

          <!-- Direct Link Action -->
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${directLink}" style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
              Reset Password on HemoLink →
            </a>
          </div>

          <!-- Security Caution -->
          <div style="background: #f9fafb; border-radius: 10px; padding: 14px 18px; border-left: 4px solid #ef4444;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
              <strong>Didn't request this?</strong> If you did not initiate this password reset, please ignore this email or notify our support team. Your account password will remain unchanged.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #fdf2f2; padding: 18px 24px; text-align: center; font-size: 12px; color: #991b1b; border-top: 1px solid #fee2e2;">
          <strong>HemoLink Real-Time Blood Donation Platform</strong><br>
          <span style="font-size: 11px; opacity: 0.8;">Saving Lives, Connecting Heroes 🩸</span>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafely({
    to: recipients,
    subject: `🔐 [${resetCode}] HemoLink Password Reset Code`,
    html,
  });
}

// ════════════════════════════════════════════════════════════
// 5. Direct Message / Email to Donor from Receiver
// ════════════════════════════════════════════════════════════
async function sendDirectMessageToDonor({
  donorName,
  donorEmail,
  requesterName,
  requesterEmail,
  hospitalName,
  city,
  bloodGroup,
  customMessage,
  requestId,
  actionUrl,
}) {
  if (!donorEmail) {
    return { success: false, reason: 'No donor email provided' };
  }
  const recipients = donorEmail;
  const clientUrl = getClientUrl();
  const finalActionUrl = actionUrl || (requestId ? `${clientUrl}/request/${requestId}?action=review` : `${clientUrl}/donor/requests`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin:0; padding:24px;">
      <div style="max-width: 580px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #fee2e2;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b91c1c, #dc2626); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">🩸 Direct Message from Patient / Hospital</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Urgent Blood Coordination for ${hospitalName}</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">
            Hello <strong>${donorName}</strong>,
          </p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 20px;">
            The patient / requester (<strong>${requesterName}</strong>) has sent you a direct message regarding your blood donation offer for <strong>${bloodGroup}</strong> blood at <strong>${hospitalName} (${city})</strong>.
          </p>

          <!-- Message Box -->
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #991b1b; letter-spacing: 1px;">
              Direct Message from Requester:
            </p>
            <p style="margin: 0; font-size: 15px; color: #7f1d1d; font-style: italic; line-height: 1.5;">
              "${customMessage || 'Thank you for responding to our emergency broadcast! We urgently need your blood donation. Please review our request on HemoLink and approve your donation.'}"
            </p>
          </div>

          <!-- Contact Details (No direct phone or direct call button before acceptance) -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px; font-size: 14px; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
              📋 Emergency Request Information
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; width: 140px;">Requester Name:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #111827;">${requesterName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Blood Group:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #dc2626;">${bloodGroup}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Hospital:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #111827;">${hospitalName}, ${city}</td>
              </tr>
              ${requesterEmail ? `
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Hospital Email:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #111827;">${requesterEmail}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Phone Number:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #059669;">
                  🔒 Available on website after you review & accept request
                </td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13.5px; color: #4b5563; line-height: 1.5; margin: 0 0 18px; text-align: center;">
            👉 Click below to view the verified medical prescription, check emergency details, and accept the blood donation. Once you accept, the receiver will receive your contact details directly!
          </p>

          <!-- Action Buttons (No direct call button, direct link to particular request page) -->
          <div style="text-align: center; margin-bottom: 12px;">
            <a href="${finalActionUrl}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: 800; font-size: 14px; display: inline-block; margin-right: 8px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);">
              🩸 View Emergency Request & Respond →
            </a>
            <a href="${clientUrl}/donor/dashboard" style="background: #f3f4f6; color: #374151; text-decoration: none; padding: 13px 20px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
              Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #fdf2f2; padding: 18px 24px; text-align: center; font-size: 12px; color: #991b1b; border-top: 1px solid #fee2e2;">
          <strong>HemoLink Real-Time Blood Donation Platform</strong><br>
          <span style="font-size: 11px; opacity: 0.8;">Direct Hospital Coordination · Saving Lives 🩸</span>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafely({
    to: recipients,
    subject: `🩸 Urgent Request: ${requesterName} needs your blood donation at ${hospitalName}`,
    html,
  });
}

module.exports = {
  sendMailSafely,
  sendBloodRequestAlert,
  sendDonorResponseAlert,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendDirectMessageToDonor,
};
