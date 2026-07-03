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
      "Authorization": "Basic " + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
      ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
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

  const hash = new URLSearchParams({
    spotify_access_token: tokenData.access_token,
    spotify_refresh_token: tokenData.refresh_token || "",
    spotify_expires_in: String(tokenData.expires_in || 3600)
  });

  return {
    statusCode: 302,
    headers: { Location: origin + returnTo + "#" + hash.toString() },
    body: ""
  };
};
