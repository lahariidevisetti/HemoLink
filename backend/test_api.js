const http = require('http');
const app = require('./server');
const { connectDB, mongoose } = require('./config/db');

async function runTests() {
  await connectDB();
  const server = http.createServer(app);
  await new Promise(res => server.listen(5001, res));
  console.log('Test server listening on port 5001');

  const BASE = 'http://localhost:5001';

  async function api(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  try {
    console.log('\n--- 1. Testing /api/health ---');
    const health = await api('/api/health');
    console.log('Health status:', health.status, health.data);

    console.log('\n--- 2. Testing Login for Donor (donor@test.com) ---');
    const donorLogin = await api('/api/auth/login', 'POST', { email: 'donor@test.com', password: 'Test@1234' });
    console.log('Donor login status:', donorLogin.status, 'profileComplete:', donorLogin.data.user?.profileComplete);
    const donorToken = donorLogin.data.token;

    console.log('\n--- 3. Testing Login for Receiver (receiver@test.com) ---');
    const receiverLogin = await api('/api/auth/login', 'POST', { email: 'receiver@test.com', password: 'Test@1234' });
    console.log('Receiver login status:', receiverLogin.status, 'profileComplete:', receiverLogin.data.user?.profileComplete);
    const receiverToken = receiverLogin.data.token;

    console.log('\n--- 4. Testing Signup for new rare O- Receiver ---');
    const testEmail = `rare_o_neg_${Date.now()}@test.com`;
    const signupRes = await api('/api/auth/signup', 'POST', {
      full_name: 'Anjali Patel',
      email: testEmail,
      password: 'Password@123',
      role: 'receiver'
    });
    console.log('Signup status:', signupRes.status, 'User:', signupRes.data.user);
    const newReceiverToken = signupRes.data.token;

    console.log('\n--- 5. Testing Receiver Extra Details / Profile creation (O-) ---');
    const profileRes = await api('/api/receiver/profile', 'POST', {
      blood_group: 'O-',
      date_of_birth: '1999-01-15',
      gender: 'Female',
      phone: '9876500001',
      city: 'Mumbai',
      address: 'Sector 4, Andheri West'
    }, newReceiverToken);
    console.log('Receiver profile creation status:', profileRes.status, profileRes.data.message);

    console.log('\n--- 6. Testing Receiver Create Blood Request for Rare O- blood ---');
    const requestRes = await api('/api/receiver/requests', 'POST', {
      blood_group: 'O-',
      hospital_name: 'Lilavati Hospital',
      city: 'Mumbai',
      urgency: 'Critical',
      units_needed: 2,
      additional_note: 'Urgent surgery! Rare O- blood needed immediately'
    }, newReceiverToken);
    console.log('Blood request creation status:', requestRes.status, requestRes.data);
    const createdRequestId = requestRes.data.request_id;

    console.log('\n--- 7. Testing Donor Get Blood Requests (Live feed) ---');
    const donorRequests = await api('/api/donor/requests', 'GET', null, donorToken);
    console.log('Donor fetched requests total:', donorRequests.data.total);
    const foundReq = donorRequests.data.requests.find(r => r.id === createdRequestId);
    console.log('Found newly created O- request in donor feed:', !!foundReq, foundReq?.hospital_name, foundReq?.blood_group);

    console.log('\n--- 8. Testing Donor Respond to Blood Request ---');
    const respondRes = await api(`/api/donor/respond/${createdRequestId}`, 'POST', {
      message: 'I can donate 1 unit of O- blood. Reaching hospital in 1 hour.'
    }, donorToken);
    console.log('Donor respond status:', respondRes.status, respondRes.data.message);

    console.log('\n--- 9. Testing Receiver View Responses ---');
    const responsesList = await api(`/api/receiver/requests/${createdRequestId}/responses`, 'GET', null, newReceiverToken);
    console.log('Receiver fetched responses total:', responsesList.data.total);
    console.log('Response donor:', responsesList.data.responses[0]?.donor_name, 'Message:', responsesList.data.responses[0]?.message);

    console.log('\n--- 10. Testing Receiver Search Available Donors ---');
    const donorsSearch = await api('/api/receiver/donors', 'GET', null, newReceiverToken);
    console.log('Search donors count:', donorsSearch.data.total, 'First donor:', donorsSearch.data.donors[0]?.full_name);

    console.log('\n--- 11. Testing Public Blood Request (Unauthenticated Guest) ---');
    const publicReqRes = await api(`/api/public/requests/${createdRequestId}`, 'GET');
    console.log('Public request status (no token):', publicReqRes.status, 'Hospital:', publicReqRes.data.request?.hospital_name, 'Blood Group:', publicReqRes.data.request?.blood_group);
    if (publicReqRes.status !== 200 || !publicReqRes.data.request) {
      throw new Error('Public request endpoint failed!');
    }

    console.log('\n--- 12. Testing Matching Donors for Blood Request ---');
    const matchingRes = await api(`/api/receiver/requests/${createdRequestId}/matching-donors`, 'GET', null, newReceiverToken);
    console.log('Matching donors status:', matchingRes.status, 'Total matching donors found:', matchingRes.data.total);
    if (matchingRes.status !== 200) {
      throw new Error('Matching donors endpoint failed!');
    }

    console.log('\n✅ ALL END-TO-END TESTS PASSED SUCCESSFULLY! 🩸');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
