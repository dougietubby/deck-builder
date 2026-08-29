process.env.GROVE_CODES = JSON.stringify({TEST: 'campA'});
const h = require('./netlify/functions/verify.js').handler;
(async ()=>{
  const res = await h({ httpMethod: 'POST', body: JSON.stringify({ code: 'TEST' }) });
  console.log(res);
})();
