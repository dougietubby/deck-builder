exports.handler = async function(event) {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        SUPABASE_URL: process.env.SUPABASE_URL || null,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || null
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'unable to read env' }) };
  }
};
