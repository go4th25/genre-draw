function encodeState(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

exports.handler = async function(event) {
  const host = event.headers.host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  const origin = proto + "://" + host;
  const redirectUri = origin + "/.netlify/functions/spotify-auth-callback";
  const returnTo = event.queryStringParameters?.returnTo || "/";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: process.env.SPOTIFY_PLAYLIST_SCOPES || "user-read-private playlist-modify-private playlist-modify-public",
    redirect_uri: redirectUri,
    state: encodeState({ returnTo })
  });

  return {
    statusCode: 302,
    headers: {
      Location: "https://accounts.spotify.com/authorize?" + params.toString()
    },
    body: ""
  };
};
