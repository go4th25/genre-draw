async function searchSpotify(title, artist) {
  try {
    const query = [title, artist].filter(Boolean).join(" ");
    const response = await fetch("/.netlify/functions/spotify-search?q=" + encodeURIComponent(query));
    const data = await response.json();

    if (!response.ok) {
      console.warn("Spotify search failed", data);
      return null;
    }

    return data.tracks && data.tracks.length ? data.tracks[0] : null;
  } catch (e) {
    console.warn("Spotify search unavailable", e);
    return null;
  }
}

function spotifyPreviewHtml(sub) {
  if (!sub.spotify_preview_url) return "";
  return '<div class="gd-spotify-preview">' +
    '<div class="gd-stub-date" style="margin-bottom:6px;color:var(--cyan);">30-second preview</div>' +
    '<audio controls preload="none" src="' + escapeHtml(sub.spotify_preview_url) + '" style="width:100%;"></audio>' +
  '</div>';
}

function spotifyEmbedHtml(sub) {
  if (!sub.spotify_embed_url) return "";

  return '<div class="gd-spotify-embed">' +
    '<iframe src="' + escapeHtml(sub.spotify_embed_url) + '" width="100%" height="80" frameborder="0" allowfullscreen="" ' +
    'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>' +
  '</div>';
}

function spotifyPlayerHtml(sub) {
  return spotifyPreviewHtml(sub) || spotifyEmbedHtml(sub);
}

function spotifySmallHtml(sub) {
  if (!sub.spotify_image && !sub.spotify_url) return "";

  return '<div class="gd-spotify-small">' +
    (sub.spotify_image ? '<img src="' + escapeHtml(sub.spotify_image) + '" alt="" />' : '') +
    '<div>' +
      (sub.spotify_album ? '<div class="gd-stub-date">' + escapeHtml(sub.spotify_album) + '</div>' : '') +
      (sub.spotify_preview_url
        ? '<div class="gd-stub-date" style="color:var(--cyan);margin-top:4px;">30-sec preview ready</div>'
        : (sub.spotify_embed_url
          ? '<div class="gd-stub-date" style="color:var(--cyan);margin-top:4px;">Spotify player ready</div>'
          : (sub.spotify_url ? '<a href="' + escapeHtml(sub.spotify_url) + '" target="_blank" rel="noopener">Open in Spotify &rarr;</a>' : '')))
      +
    '</div>' +
  '</div>';
}

function saveSpotifyTokenData(data) {
  const expiresIn = Number(data.expires_in || 3600);
  const expiresAt = Date.now() + ((expiresIn - 60) * 1000);
  localStorage.setItem("gdSpotifyAccessToken", data.access_token);
  localStorage.setItem("gdSpotifyExpiresAt", String(expiresAt));
  if (data.refresh_token) localStorage.setItem("gdSpotifyRefreshToken", data.refresh_token);
}

function handleSpotifyRedirectIfNeeded() {
  const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
  const accessToken = hash.get("spotify_access_token");
  const refreshToken = hash.get("spotify_refresh_token");
  const expiresIn = hash.get("spotify_expires_in");
  const error = hash.get("spotify_error");

  if (error) {
    console.error("Spotify authorization failed", error);
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    return false;
  }

  if (!accessToken) return false;

  saveSpotifyTokenData({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn || 3600
  });

  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return true;
}

function isSpotifyConnected() {
  return !!localStorage.getItem("gdSpotifyAccessToken") || !!localStorage.getItem("gdSpotifyRefreshToken");
}

function clearSpotifyConnection() {
  localStorage.removeItem("gdSpotifyAccessToken");
  localStorage.removeItem("gdSpotifyRefreshToken");
  localStorage.removeItem("gdSpotifyExpiresAt");
}

function connectSpotifyForPlaylists() {
  localStorage.setItem("gdPendingPlaylist", "1");
  const returnTo = window.location.pathname + window.location.search;
  window.location.href = "/.netlify/functions/spotify-auth-start?returnTo=" + encodeURIComponent(returnTo);
}

async function getSpotifyAccessToken() {
  const token = localStorage.getItem("gdSpotifyAccessToken");
  const expiresAt = Number(localStorage.getItem("gdSpotifyExpiresAt") || 0);
  if (token && Date.now() < expiresAt) return token;

  const refreshToken = localStorage.getItem("gdSpotifyRefreshToken");
  if (!refreshToken) return null;

  const response = await fetch("/.netlify/functions/spotify-refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshToken })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Spotify refresh failed", data);
    clearSpotifyConnection();
    return null;
  }

  saveSpotifyTokenData(data);
  return data.access_token;
}

async function createSpotifyPlaylistForRound() {
  const tracks = state.submissions
    .map(s => s.spotify_uri)
    .filter(Boolean);

  if (!tracks.length) {
    alert("No Spotify track IDs found.");
    return null;
  }

  const response = await fetch("/.netlify/functions/spotify-create-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      playlistName: "Genre Draw — " + state.round.id + " — " + state.round.genre,
      description: "Genre Draw daily playlist for " + state.round.genre + ".",
      tracks: tracks
    })
  });

  const data = await response.json();

  if (response.status === 401) {
    window.location.href =
      "/.netlify/functions/spotify-auth-start?returnTo=" +
      encodeURIComponent(window.location.pathname + window.location.search);
    return null;
  }

  if (!response.ok) {
    alert(JSON.stringify(data, null, 2));
    console.error("Spotify playlist error", data);
    return null;
  }

  const { error } = await sb
    .from("gd_rounds")
    .update({
      spotify_playlist_id: data.playlistId,
      spotify_playlist_url: data.playlistUrl
    })
    .eq("id", state.round.id);

  if (error) {
    alert("Playlist was created, but saving to Supabase failed.");
    console.error("Supabase playlist save error", error);
    return data.playlistUrl;
  }

  state.round.spotify_playlist_id = data.playlistId;
  state.round.spotify_playlist_url = data.playlistUrl;

  return data.playlistUrl;
}