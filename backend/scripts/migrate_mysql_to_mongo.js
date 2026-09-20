// scripts/migrate_mysql_to_mongo.js
// Migrates all tables from local MySQL to MongoDB Atlas with complete relational mapping

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

const {
  User,
  DonorProfile,
  ReceiverProfile,
  BloodRequest,
  DonorResponse,
  Notification,
  PasswordReset,
} = require('../models');

async function migrate() {
  console.log('🚀 Starting HemoLink MySQL -> MongoDB Atlas Migration...');
  console.log('MongoDB URI:', process.env.MONGODB_URI?.replace(/:([^@]+)@/, ':****@'));

  // 1. Connect to MySQL
  const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'none',
    database: process.env.DB_NAME || 'hemolink',
    waitForConnections: true,
    connectionLimit: 5,
  });

  // Test MySQL connection
  const mysqlConn = await mysqlPool.getConnection();
  console.log('✅ Connected to MySQL [hemolink]');
  mysqlConn.release();

  // 2. Connect to MongoDB Atlas
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas [hemolink]');

  // Clean collections before fresh migration
  console.log('🧹 Clearing previous MongoDB collections...');
  await Promise.all([
    User.deleteMany({}),
    DonorProfile.deleteMany({}),
    ReceiverProfile.deleteMany({}),
    BloodRequest.deleteMany({}),
    DonorResponse.deleteMany({}),
    Notification.deleteMany({}),
    PasswordReset.deleteMany({}),
  ]);

  const userIdMap = {};     // mysql_id -> ObjectId
  const requestIdMap = {};  // mysql_id -> ObjectId

  // 3. Migrate Users
  console.log('\n--- Migrating Users ---');
  const [users] = await mysqlPool.query('SELECT * FROM users ORDER BY id ASC');
  console.log(`Found ${users.length} users in MySQL.`);

  for (const u of users) {
    const doc = await User.create({
      legacy_id: u.id,
      full_name: u.full_name,
      email: u.email.toLowerCase().trim(),
      password_hash: u.password_hash,
      role: u.role,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    });
    userIdMap[u.id] = doc._id;
  }
  console.log(`✅ Migrated ${Object.keys(userIdMap).length} users to MongoDB.`);

  // 4. Migrate Donor Profiles
  console.log('\n--- Migrating Donor Profiles ---');
  const [donorProfiles] = await mysqlPool.query('SELECT * FROM donor_profiles ORDER BY id ASC');
  console.log(`Found ${donorProfiles.length} donor profiles in MySQL.`);

  let dpCount = 0;
  for (const dp of donorProfiles) {
    const mongoUserId = userIdMap[dp.user_id];
    if (!mongoUserId) {
      console.warn(`⚠️ Donor profile ${dp.id} references missing user ${dp.user_id}. Skipping.`);
      continue;
    }
    await DonorProfile.create({
      legacy_id: dp.id,
      user_id: mongoUserId,
      blood_group: dp.blood_group,
      date_of_birth: dp.date_of_birth,
      gender: dp.gender,
      weight_kg: Number(dp.weight_kg),
      phone: dp.phone,
      house_no: dp.house_no,
      street: dp.street,
      city: dp.city,
      state: dp.state,
      pincode: dp.pincode,
      last_donation_date: dp.last_donation_date,
      is_first_time: Boolean(dp.is_first_time),
      has_chronic_illness: Boolean(dp.has_chronic_illness),
      on_medication: Boolean(dp.on_medication),
      tattoo_recent: Boolean(dp.tattoo_recent),
      is_available: Boolean(dp.is_available),
      total_donations: Number(dp.total_donations) || 0,
      createdAt: dp.created_at,
      updatedAt: dp.updated_at,
    });
    dpCount++;
  }
  console.log(`✅ Migrated ${dpCount} donor profiles.`);

  // 5. Migrate Receiver Profiles
  console.log('\n--- Migrating Receiver Profiles ---');
  const [receiverProfiles] = await mysqlPool.query('SELECT * FROM receiver_profiles ORDER BY id ASC');
  console.log(`Found ${receiverProfiles.length} receiver profiles in MySQL.`);

  let rpCount = 0;
  for (const rp of receiverProfiles) {
    const mongoUserId = userIdMap[rp.user_id];
    if (!mongoUserId) {
      console.warn(`⚠️ Receiver profile ${rp.id} references missing user ${rp.user_id}. Skipping.`);
      continue;
    }
    await ReceiverProfile.create({
      legacy_id: rp.id,
      user_id: mongoUserId,
      blood_group: rp.blood_group,
      date_of_birth: rp.date_of_birth,
      gender: rp.gender,
      phone: rp.phone,
      city: rp.city,
      address: rp.address,
      createdAt: rp.created_at,
      updatedAt: rp.updated_at,
    });
    rpCount++;
  }
  console.log(`✅ Migrated ${rpCount} receiver profiles.`);

  // 6. Migrate Blood Requests
  console.log('\n--- Migrating Blood Requests ---');
  const [bloodRequests] = await mysqlPool.query('SELECT * FROM blood_requests ORDER BY id ASC');
  console.log(`Found ${bloodRequests.length} blood requests in MySQL.`);

  for (const br of bloodRequests) {
    const mongoReceiverId = userIdMap[br.receiver_id];
    if (!mongoReceiverId) {
      console.warn(`⚠️ Blood request ${br.id} references missing receiver user ${br.receiver_id}. Skipping.`);
      continue;
    }
    const doc = await BloodRequest.create({
      legacy_id: br.id,
      receiver_id: mongoReceiverId,
      blood_group: br.blood_group,
      hospital_name: br.hospital_name,
      city: br.city,
      urgency: br.urgency,
      units_needed: br.units_needed,
      additional_note: br.additional_note,
      document_url: br.document_url,
      status: br.status,
      createdAt: br.created_at,
      updatedAt: br.updated_at,
    });
    requestIdMap[br.id] = doc._id;
  }
  console.log(`✅ Migrated ${Object.keys(requestIdMap).length} blood requests.`);

  // 7. Migrate Donor Responses
  console.log('\n--- Migrating Donor Responses ---');
  const [donorResponses] = await mysqlPool.query('SELECT * FROM donor_responses ORDER BY id ASC');
  console.log(`Found ${donorResponses.length} donor responses in MySQL.`);

  let drCount = 0;
  for (const dr of donorResponses) {
    const mongoReqId = requestIdMap[dr.request_id];
    const mongoDonorId = userIdMap[dr.donor_id];
    if (!mongoReqId || !mongoDonorId) {
      console.warn(`⚠️ Donor response ${dr.id} references missing request or donor. Skipping.`);
      continue;
    }
    await DonorResponse.create({
      legacy_id: dr.id,
      request_id: mongoReqId,
      donor_id: mongoDonorId,
      status: dr.status,
      message: dr.message,
      responded_at: dr.responded_at,
      createdAt: dr.responded_at,
      updatedAt: dr.updated_at,
    });
    drCount++;
  }
  console.log(`✅ Migrated ${drCount} donor responses.`);

  // 8. Migrate Notifications
  console.log('\n--- Migrating Notifications ---');
  const [notifications] = await mysqlPool.query('SELECT * FROM notifications ORDER BY id ASC');
  console.log(`Found ${notifications.length} notifications in MySQL.`);

  let notifCount = 0;
  for (const n of notifications) {
    const mongoUserId = userIdMap[n.user_id];
    if (!mongoUserId) continue;
    await Notification.create({
      legacy_id: n.id,
      user_id: mongoUserId,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: Boolean(n.is_read),
      createdAt: n.created_at,
    });
    notifCount++;
  }
  console.log(`✅ Migrated ${notifCount} notifications.`);

  // 9. Migrate Password Resets
  console.log('\n--- Migrating Password Resets ---');
  const [passwordResets] = await mysqlPool.query('SELECT * FROM password_resets ORDER BY id ASC');
  console.log(`Found ${passwordResets.length} password resets in MySQL.`);

  let prCount = 0;
  for (const pr of passwordResets) {
    const mongoUserId = userIdMap[pr.user_id];
    if (!mongoUserId) continue;
    await PasswordReset.create({
      user_id: mongoUserId,
      token: pr.token,
      expires_at: pr.expires_at,
      used: Boolean(pr.used),
      createdAt: pr.created_at,
    });
    prCount++;
  }
  console.log(`✅ Migrated ${prCount} password resets.`);

  console.log('\n========================================');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('Users:           ', Object.keys(userIdMap).length);
  console.log('Donor Profiles:  ', dpCount);
  console.log('Receiver Profiles:', rpCount);
  console.log('Blood Requests:  ', Object.keys(requestIdMap).length);
  console.log('Donor Responses: ', drCount);
  console.log('Notifications:   ', notifCount);
  console.log('Password Resets: ', prCount);
  console.log('========================================\n');

  await mysqlPool.end();
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
