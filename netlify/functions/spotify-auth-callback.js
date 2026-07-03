function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state || "", "base64url").toString("utf8"));
  } catch (_e) {
    return { returnTo: "/" };
  }
}

exports.handler = async function(event) {
  const host = event.headers.host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  const origin = proto + "://" + host;
  const redirectUri = origin + "/.netlify/functions/spotify-auth-callback";

  const code = event.queryStringParameters?.code;
  const spotifyError = event.queryStringParameters?.error;
  const state = decodeState(event.queryStringParameters?.state);
  const returnTo = state.returnTo || "/";

  if (spotifyError || !code) {
    return {
      statusCode: 302,
      headers: { Location: origin + returnTo + "#spotify_error=" + encodeURIComponent(spotifyError || "missing_code") },
      body: ""
    };
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
      ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    }).toString()
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return {
      statusCode: 302,
      headers: { Location: origin + returnTo + "#spotify_error=" + encodeURIComponent(tokenData.error_description || tokenData.error || "token_failed") },
      body: ""
    };
  }

  return {
    statusCode: 302,
    multiValueHeaders: {
      "Set-Cookie": [
        `gd_spotify_access_token=${tokenData.access_token}; Path=/; Max-Age=${tokenData.expires_in || 3600}; SameSite=Lax; Secure`,
        `gd_spotify_refresh_token=${tokenData.refresh_token || ""}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
      ]
    },
    headers: {
      Location: origin + returnTo + "#spotify_connected=1"
    },
    body: ""
  };
};