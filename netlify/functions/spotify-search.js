exports.handler = async function(event) {
  try {
    const query = event.queryStringParameters.q;

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing search query" })
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
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Spotify token failed", details: tokenData })
      };
    }

    const searchResponse = await fetch(
      "https://api.spotify.com/v1/search?type=track&limit=5&q=" + encodeURIComponent(query),
      {
        headers: {
          "Authorization": "Bearer " + tokenData.access_token
        }
      }
    );

    const searchData = await searchResponse.json();

    const tracks = (searchData.tracks?.items || []).map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(", "),
      album: track.album.name,
      image: track.album.images?.[0]?.url || null,
      spotifyUrl: track.external_urls.spotify,
      embedUrl: "https://open.spotify.com/embed/track/" + track.id
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ tracks })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
