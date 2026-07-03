const SUPABASE_URL = "https://cqnpjwyldsuxkpazsoxx.supabase.co";

function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state || "", "base64url").toString("utf8"));
  } catch (_e) {
    return { returnTo: "/", mode: "user" };
  }
}

async function saveAdminToken(tokenData) {
  const expiresAt = new Date(Date.now() + ((tokenData.expires_in || 3600) - 60) * 1000).toISOString();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(SUPABASE_URL + "/rest/v1/gd_spotify_admin_token?on_conflict=id", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      id: 1,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Could not save admin Spotify token: " + text);
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

  if (state.mode === "admin") {
    try {
      await saveAdminToken(tokenData);
    } catch (e) {
      return {
        statusCode: 302,
        headers: { Location: origin + returnTo + "#spotify_error=" + encodeURIComponent("admin_save_failed") },
        body: ""
      };
    }

    return {
      statusCode: 302,
      headers: { Location: origin + returnTo + "#spotify_admin_connected=1" },
      body: ""
    };
  }

  // Regular per-user cookie flow — kept for backward compatibility, no
  // longer used by the main game now that syncing happens automatically.
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
