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

function spotifyEmbedHtml(sub) {
    if (!sub.spotify_embed_url) return "";

    return '<div class="gd-spotify-embed">' +
      '<iframe src="' + escapeHtml(sub.spotify_embed_url) + '" width="100%" height="80" frameborder="0" allowfullscreen="" ' +
      'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>' +
    '</div>';
  }

function spotifySmallHtml(sub) {
    if (!sub.spotify_image && !sub.spotify_url) return "";

    return '<div class="gd-spotify-small">' +
      (sub.spotify_image ? '<img src="' + escapeHtml(sub.spotify_image) + '" alt="" />' : '') +
      '<div>' +
        (sub.spotify_album ? '<div class="gd-stub-date">' + escapeHtml(sub.spotify_album) + '</div>' : '') +
        (sub.spotify_embed_url ? '<div class="gd-stub-date" style="color:var(--cyan);margin-top:4px;">Spotify preview ready</div>' : (sub.spotify_url ? '<a href="' + escapeHtml(sub.spotify_url) + '" target="_blank" rel="noopener">Open in Spotify &rarr;</a>' : '')) +
      '</div>' +
    '</div>';
  }
