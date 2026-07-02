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

function getSpotifyRedirectUri() {
  return window.location.origin + window.location.pathname;
}

function randomString(length) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values).map(x => possible[x % possible.length]).join("");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await window.crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function connectSpotifyForPlaylists() {
  localStorage.setItem("gdPendingPlaylist", "1");
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  localStorage.setItem("gdSpotifyCodeVerifier", verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: getSpotifyRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: "genre-draw-playlist"
  });

  window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
}

async function handleSpotifyRedirectIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const stateParam = params.get("state");

  if (!code || stateParam !== "genre-draw-playlist") return false;

  const verifier = localStorage.getItem("gdSpotifyCodeVerifier");
  if (!verifier) return false;

  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: getSpotifyRedirectUri(),
    code_verifier: verifier
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Spotify authorization failed", data);
    localStorage.removeItem("gdSpotifyCodeVerifier");
    return false;
  }

  saveSpotifyTokenData(data);
  localStorage.removeItem("gdSpotifyCodeVerifier");

  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
  return true;
}

function saveSpotifyTokenData(data) {
  const expiresAt = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  localStorage.setItem("gdSpotifyAccessToken", data.access_token);
  localStorage.setItem("gdSpotifyExpiresAt", String(expiresAt));
  if (data.refresh_token) localStorage.setItem("gdSpotifyRefreshToken", data.refresh_token);
}

function isSpotifyConnected() {
  return !!localStorage.getItem("gdSpotifyAccessToken") || !!localStorage.getItem("gdSpotifyRefreshToken");
}

async function getSpotifyAccessToken() {
  const token = localStorage.getItem("gdSpotifyAccessToken");
  const expiresAt = Number(localStorage.getItem("gdSpotifyExpiresAt") || 0);
  if (token && Date.now() < expiresAt) return token;

  const refreshToken = localStorage.getItem("gdSpotifyRefreshToken");
  if (!refreshToken) return null;

  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
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

function clearSpotifyConnection() {
  localStorage.removeItem("gdSpotifyAccessToken");
  localStorage.removeItem("gdSpotifyRefreshToken");
  localStorage.removeItem("gdSpotifyExpiresAt");
  localStorage.removeItem("gdSpotifyCodeVerifier");
}

async function createSpotifyPlaylistForRound() {
  const token = await getSpotifyAccessToken();
  if (!token) {
    await connectSpotifyForPlaylists();
    return null;
  }

  const tracks = state.submissions
    .filter(s => s.spotify_uri)
    .map(s => s.spotify_uri);

  if (!tracks.length) {
    throw new Error("No Spotify tracks are available for this round yet.");
  }

  const meResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { "Authorization": "Bearer " + token }
  });
  const me = await meResponse.json();
  if (!meResponse.ok) throw new Error(me.error?.message || "Could not load Spotify profile.");

  const playlistName = "Genre Draw — " + state.round.id + " — " + state.round.genre;
  const createResponse = await fetch("https://api.spotify.com/v1/users/" + encodeURIComponent(me.id) + "/playlists", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: playlistName,
      description: "Genre Draw daily playlist for " + state.round.genre + ".",
      public: false
    })
  });
  const playlist = await createResponse.json();
  if (!createResponse.ok) throw new Error(playlist.error?.message || "Could not create playlist.");

  const addResponse = await fetch("https://api.spotify.com/v1/playlists/" + encodeURIComponent(playlist.id) + "/tracks", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uris: tracks })
  });
  const addData = await addResponse.json();
  if (!addResponse.ok) throw new Error(addData.error?.message || "Could not add tracks to playlist.");

  const playlistUrl = playlist.external_urls.spotify;
  await saveRoundPlaylist(state.round.id, playlist.id, playlistUrl);
  state.round.spotify_playlist_id = playlist.id;
  state.round.spotify_playlist_url = playlistUrl;
  return playlistUrl;
}
