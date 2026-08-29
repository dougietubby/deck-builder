const http = require('http');
const https = require('https');

function getPublicConfig() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8888/.netlify/functions/public-config', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          resolve(j);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async function main(){
  try{
    const cfg = await getPublicConfig();
    const SUPABASE_URL = cfg.SUPABASE_URL;
    const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in public-config', cfg);
      process.exit(2);
    }

    const endpoint = new URL('/auth/v1/otp', SUPABASE_URL).toString();
    const body = JSON.stringify({ email: 'dougie.projects@gmail.com', redirect_to: 'http://localhost:8888/home/' });

    const urlObj = new URL(endpoint);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log('status', res.statusCode);
        try { console.log('body', JSON.parse(d)); } catch (e) { console.log('body', d); }
      });
    });
    req.on('error', e => console.error('err', e));
    req.write(body);
    req.end();

  } catch (e) {
    console.error('failed', e);
    process.exit(1);
  }
})();
