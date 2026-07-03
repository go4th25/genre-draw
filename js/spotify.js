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

// Fires once per page load (or once per round completion) to ask the server
// to fold this round's songs into the month's playlist. Safe to call more
// than once — the server no-ops if the round is already synced.
var gdSyncTriggered = false;

function triggerAutoPlaylistSync(roundId) {
  if (gdSyncTriggered) return;
  gdSyncTriggered = true;

  fetch("/.netlify/functions/spotify-sync-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roundId: roundId })
  })
    .then(async function(res) {
      const data = await res.json();
      if (!res.ok) {
        console.warn("Playlist sync did not complete", data);
        gdSyncTriggered = false;
        return;
      }
      if (data.playlistUrl) {
        state.round.spotify_playlist_id = data.playlistId;
        state.round.spotify_playlist_url = data.playlistUrl;
        state.monthPlaylistUrl = data.playlistUrl;
        renderMusicZone(true);
      }
    })
    .catch(function(e) {
      console.warn("Playlist sync error", e);
      gdSyncTriggered = false;
    });
}
