function parseCookies(cookieHeader) {
  return Object.fromEntries(
    (cookieHeader || "")
      .split(";")
      .map(c => c.trim().split("="))
      .filter(pair => pair.length === 2)
  );
}

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const cookies = parseCookies(event.headers.cookie);
    const accessToken = body.accessToken || cookies.gd_spotify_access_token;
    const tracks = Array.isArray(body.tracks) ? body.tracks : [];

    if (!accessToken) {
      return { statusCode: 401, body: JSON.stringify({ error: "Missing Spotify access token" }) };
    }

    if (!tracks.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "No Spotify track URIs supplied" }) };
    }

    const meResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + accessToken }
    });
    const me = await meResponse.json();

    if (!meResponse.ok) {
  return {
    statusCode: meResponse.status,
    body: JSON.stringify({
      step: "GET /me",
      spotifyStatus: meResponse.status,
      spotifyResponse: me
    })
  };
}

    const createResponse = await fetch("https://api.spotify.com/v1/users/" + encodeURIComponent(me.id) + "/playlists", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: body.playlistName || "Genre Draw",
        description: body.description || "Created by Genre Draw.",
        public: false
      })
    });

    const playlist = await createResponse.json();

    if (!createResponse.ok) {
  return {
    statusCode: createResponse.status,
    body: JSON.stringify({
      step: "CREATE PLAYLIST",
      spotifyStatus: createResponse.status,
      spotifyResponse: playlist
    })
  };
}

    const addResponse = await fetch("https://api.spotify.com/v1/playlists/" + encodeURIComponent(playlist.id) + "/tracks", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ uris: tracks })
    });

    const addData = await addResponse.json();

    if (!addResponse.ok) {
  return {
    statusCode: addResponse.status,
    body: JSON.stringify({
      step: "ADD TRACKS",
      spotifyStatus: addResponse.status,
      spotifyResponse: addData
    })
  };
}

    return {
      statusCode: 200,
      body: JSON.stringify({
        playlistId: playlist.id,
        playlistUrl: playlist.external_urls.spotify,
        added: tracks.length
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};