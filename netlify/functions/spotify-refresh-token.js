exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const refreshToken = body.refreshToken;

    if (!refreshToken) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing refresh token" }) };
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }).toString()
    });

    const data = await response.json();
    return { statusCode: response.ok ? 200 : 500, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
