const SUPABASE_URL = "https://cqnpjwyldsuxkpazsoxx.supabase.co";

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  };
}

async function sbSelectOne(table, query) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + query + "&limit=1", {
    headers: serviceHeaders()
  });
  if (!res.ok) throw new Error("Supabase select failed on " + table + ": " + await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

async function sbSelectMany(table, query) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + query, {
    headers: serviceHeaders()
  });
  if (!res.ok) throw new Error("Supabase select failed on " + table + ": " + await res.text());
  return res.json();
}

async function sbUpsert(table, row, onConflict) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?on_conflict=" + onConflict, {
    method: "POST",
    headers: Object.assign({ Prefer: "resolution=merge-duplicates,return=representation" }, serviceHeaders()),
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error("Supabase upsert failed on " + table + ": " + await res.text());
  const rows = await res.json();
  return rows[0];
}

async function sbPatch(table, query, row) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + query, {
    method: "PATCH",
    headers: Object.assign({ Prefer: "return=representation" }, serviceHeaders()),
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error("Supabase patch failed on " + table + ": " + await res.text());
  const rows = await res.json();
  return rows[0];
}

async function getValidAdminAccessToken() {
  const tokenRow = await sbSelectOne("gd_spotify_admin_token", "id=eq.1&select=*");
  if (!tokenRow) return null;

  if (Date.now() < new Date(tokenRow.expires_at).getTime()) {
    return tokenRow.access_token;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
      ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRow.refresh_token
    }).toString()
  });

  const data = await response.json();
  if (!response.ok) throw new Error("Spotify admin token refresh failed: " + JSON.stringify(data));

  const expiresAt = new Date(Date.now() + ((data.expires_in || 3600) - 60) * 1000).toISOString();
  await sbUpsert("gd_spotify_admin_token", {
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokenRow.refresh_token,
    expires_at: expiresAt
  }, "id");

  return data.access_token;
}

function monthIdFromDay(dayId) {
  return dayId.slice(0, 7);
}

function monthLabel(monthId) {
  const parts = monthId.split("-").map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
  return dt.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

async function getPlaylistTrackUris(accessToken, playlistId) {
  const uris = new Set();
  let url = "https://api.spotify.com/v1/playlists/" + encodeURIComponent(playlistId) + "/tracks?fields=items(track(uri)),next&limit=100";

  while (url) {
    const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
    const data = await res.json();
    if (!res.ok) throw new Error("GET PLAYLIST TRACKS failed: " + JSON.stringify(data));
    for (const item of data.items || []) {
      if (item.track && item.track.uri) uris.add(item.track.uri);
    }
    url = data.next || null;
  }

  return uris;
}

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const roundId = body.roundId;
    if (!roundId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing roundId" }) };
    }

    const accessToken = await getValidAdminAccessToken();
    if (!accessToken) {
      return {
        statusCode: 412,
        body: JSON.stringify({ error: "Spotify isn't connected for the app yet. Visit /.netlify/functions/spotify-auth-start?mode=admin once to connect it." })
      };
    }

    const round = await sbSelectOne("gd_rounds", "id=eq." + roundId + "&select=*");
    if (!round) {
      return { statusCode: 404, body: JSON.stringify({ error: "Round not found" }) };
    }

    // Already synced — safe to call this endpoint as many times as needed.
    if (round.spotify_playlist_url) {
      return {
        statusCode: 200,
        body: JSON.stringify({ playlistId: round.spotify_playlist_id, playlistUrl: round.spotify_playlist_url, skipped: true })
      };
    }

    const submissions = await sbSelectMany("gd_submissions", "round_id=eq." + roundId + "&select=*");
    const tracks = submissions.map(s => s.spotify_uri).filter(Boolean);
    if (!tracks.length) {
      return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: "No Spotify track URIs yet" }) };
    }

    const monthId = monthIdFromDay(roundId);
    let monthRow = await sbSelectOne("gd_month_playlists", "id=eq." + monthId + "&select=*");
    let playlistId = monthRow ? monthRow.spotify_playlist_id : null;
    let playlistUrl = monthRow ? monthRow.spotify_playlist_url : null;

    if (!playlistId) {
      const createResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Genre Draw — " + monthLabel(monthId),
          description: "Every Genre Draw pick from " + monthLabel(monthId) + ", all in one place.",
          public: false
        })
      });
      const playlist = await createResponse.json();
      if (!createResponse.ok) {
        return { statusCode: createResponse.status, body: JSON.stringify({ step: "CREATE PLAYLIST", spotifyResponse: playlist }) };
      }
      playlistId = playlist.id;
      playlistUrl = playlist.external_urls.spotify;
      await sbUpsert("gd_month_playlists", { id: monthId, spotify_playlist_id: playlistId, spotify_playlist_url: playlistUrl }, "id");
    }

    const existingUris = await getPlaylistTrackUris(accessToken, playlistId);
    const newTracks = tracks.filter(uri => !existingUris.has(uri));

    if (newTracks.length) {
      const addResponse = await fetch("https://api.spotify.com/v1/playlists/" + encodeURIComponent(playlistId) + "/items", {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: newTracks })
      });
      const addData = await addResponse.json();
      if (!addResponse.ok) {
        return { statusCode: addResponse.status, body: JSON.stringify({ step: "ADD TRACKS", spotifyResponse: addData }) };
      }
    }

    await sbPatch("gd_rounds", "id=eq." + roundId, {
      spotify_playlist_id: playlistId,
      spotify_playlist_url: playlistUrl
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        playlistId: playlistId,
        playlistUrl: playlistUrl,
        added: newTracks.length,
        skippedDuplicates: tracks.length - newTracks.length
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
