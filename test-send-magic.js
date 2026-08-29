const https = require('https');
const url = 'https://vtgdwihretrnmjnalfxd.supabase.co/auth/v1/otp';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0Z2R3aWhyZXRybm1qbmFsZnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzI1NjAsImV4cCI6MjA4Njc0ODU2MH0.J5ClsAfN7F0bA5fAyT04Aege3amYPxloXBGprBvkH-Y';
const data = JSON.stringify({ email: 'you@example.com', redirect_to: 'http://localhost:8888/home/' });

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

const req = https.request(url, options, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log('body', d);
  });
});
req.on('error', e => console.error('err', e));
req.write(data);
req.end();
