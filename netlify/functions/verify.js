exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method not allowed"
      })
    };
  }

  try {

    const body = JSON.parse(event.body);
    const code = body.code;

    const codes = JSON.parse(
      process.env.GROVE_CODES || "{}"
    );

    const camp = codes[code];

    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: !!camp,
        camp: camp || null
      })
    };

  } catch (err) {

    return {
      statusCode: 500,
      body: JSON.stringify({
        valid: false
      })
    };

  }

};