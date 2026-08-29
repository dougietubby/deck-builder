const https = require('https');

function getProdConfig() {
  return new Promise((resolve, reject) => {
    https.get('https://404find.us/.netlify/functions/public-config', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: d }); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postOtp(supabaseUrl, anonKey) {
  return new Promise((resolve, reject) => {
    const endpoint = new URL('/auth/v1/otp', supabaseUrl).toString();
    const body = JSON.stringify({ email: 'invalid@@example', redirect_to: 'https://404find.us/home/' });

    const urlObj = new URL(endpoint);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    };

    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async function(){
  try {
    const cfg = await getProdConfig();
    console.log('public-config status', cfg.status);
    console.log('public-config body', cfg.body);
    try {
      const json = JSON.parse(cfg.body);
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = json;
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('Missing values in public-config');
        process.exit(2);
      }
      const res = await postOtp(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('otp post status', res.status);
      console.log('otp post body', res.body);
    } catch (e) {
      console.error('public-config parse error', e);
      process.exit(1);
    }
  } catch (e) {
    console.error('request failed', e);
    process.exit(1);
  }
})();
