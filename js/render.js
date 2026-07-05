function render() {
    const round = state.round;
    const submittedCount = state.submissions.length;
    const allSubmitted = submittedCount === NAMES.length;

    const playerListHtml = NAMES.map(function(name) {
      const sub = getSubmissionFor(name);

      if (sub) {
        return '<div class="gd-stub">' +
          '<div class="gd-stub-left">' +
            '<div class="gd-stub-date">' + escapeHtml(name) + '</div>' +
            '<div class="gd-stub-main"><b>' + escapeHtml(sub.song_title) + '</b> — ' + escapeHtml(sub.song_artist) + '</div>' +
            spotifySmallHtml(sub) +
            spotifyPlayerHtml(sub) +
          '</div>' +
          '<div class="gd-stub-genre">Submitted</div>' +
        '</div>';
      }

      return '<div class="gd-stub">' +
        '<div class="gd-stub-left">' +
          '<div class="gd-stub-date">' + escapeHtml(name) + '</div>' +
          '<div class="gd-stub-main"><span style="color:var(--muted)">Waiting for a song</span></div>' +
        '</div>' +
        '<div class="gd-stub-genre">Open</div>' +
      '</div>';
    }).join("");

    const historyHtml = state.history.length
      ? state.history.map(function(h) {
          return '<div class="gd-stub">' +
            '<div class="gd-stub-left">' +
              '<div class="gd-stub-date">' + prettyDate(h.id) + '</div>' +
              '<div class="gd-stub-main"><b>' + escapeHtml(h.genre) + '</b></div>' +
            '</div>' +
          '</div>';
        }).join("")
      : '<p class="gd-empty">No past group rounds yet.</p>';

    root.innerHTML =
      '<div class="gd-header">' +
        '<p class="gd-eyebrow">Group Chat Radio</p>' +
        '<h1 class="gd-title">Genre <span>Draw</span></h1>' +
        '<p class="gd-sub">One prompt. Five songs. Straight to the playlist.</p>' +
      '</div>' +

      '<div class="gd-ticket">' +
        '<div class="gd-ticket-top"><span>Group Round</span><span>' + prettyDate(round.id) + '</span></div>' +
        '<p class="gd-drawn-for">Today&apos;s prompt</p>' +
        '<div class="gd-genre-stamp">' + escapeHtml(round.genre) + '</div>' +
        '<div class="gd-status-row"><span class="gd-dot ' + (allSubmitted ? 'gd-done' : 'gd-live') + '"></span><span>' + submittedCount + ' / ' + NAMES.length + ' songs submitted' + (allSubmitted ? ' — submissions locked' : '') + '</span></div>' +
        '<div class="gd-perf"></div>' +
        '<div id="gd-form-zone"></div>' +
      '</div>' +

      '<p class="gd-hist-title">Today&apos;s Submissions</p>' +
      playerListHtml +

      '<div id="gd-music-zone"></div>' +

      '<p class="gd-hist-title" style="margin-top:28px;">Past Rounds</p>' +
      historyHtml;

    renderFormZone();
    renderMusicZone(allSubmitted);
  }

function renderFormZone() {
    const zone = document.getElementById("gd-form-zone");
    const savedPlayer = getSavedPlayer();

    if (!savedPlayer) {
      const playerOptions = NAMES.map(function(name) {
        return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
      }).join("");

      zone.innerHTML =
        '<div class="gd-form">' +
          '<div class="gd-field"><label for="gd-player">Who are you?</label>' +
            '<select id="gd-player" style="width:100%;background:var(--panel-2);border:1px solid rgba(242,236,216,0.14);border-radius:8px;padding:11px 12px;color:var(--paper);font-family:Space Grotesk,sans-serif;font-size:15px;">' +
              playerOptions +
            '</select>' +
          '</div>' +
          '<button class="gd-submit-btn" id="gd-save-player-btn">Continue</button>' +
        '</div>';

      document.getElementById("gd-save-player-btn").onclick = function() {
        savePlayer(document.getElementById("gd-player").value);
        render();
      };

      return;
    }

    const player = savedPlayer;
    const existing = getSubmissionFor(player);
    const allSubmitted = state.submissions.length === NAMES.length;

    if (allSubmitted && existing) {
      zone.innerHTML =
        '<div class="gd-submitted">' +
          '<div class="gd-status-row" style="margin-top:0;margin-bottom:14px;">' +
            '<span>Playing as <b>' + escapeHtml(player) + '</b></span>' +
            '<button class="gd-edit-link" id="gd-switch-player" style="margin-left:auto;">Switch player</button>' +
          '</div>' +
          '<p class="gd-song-title">' + escapeHtml(existing.song_title) + '</p>' +
          '<p class="gd-song-artist">' + escapeHtml(existing.song_artist) + '</p>' +
          spotifySmallHtml(existing) +
          spotifyPlayerHtml(existing) +
          '<p class="gd-spotify-note" style="margin-top:12px;">All 5 songs are in, so submissions are locked for today.</p>' +
        '</div>';

      document.getElementById("gd-switch-player").onclick = function() {
        clearSavedPlayer();
        render();
      };

      return;
    }

    zone.innerHTML =
      '<div class="gd-form">' +
        '<div class="gd-status-row" style="margin-top:0;margin-bottom:14px;">' +
          '<span>Playing as <b>' + escapeHtml(player) + '</b></span>' +
          '<button class="gd-edit-link" id="gd-switch-player" style="margin-left:auto;">Switch player</button>' +
        '</div>' +
        '<div class="gd-row2">' +
          '<div class="gd-field"><label for="gd-title">Song title</label>' +
          '<input id="gd-title" type="text" placeholder="e.g. Plastic Love" value="' + (existing ? escapeHtml(existing.song_title) : '') + '" /></div>' +
          '<div class="gd-field"><label for="gd-artist">Artist</label>' +
          '<input id="gd-artist" type="text" placeholder="e.g. Mariya Takeuchi" value="' + (existing ? escapeHtml(existing.song_artist) : '') + '" /></div>' +
        '</div>' +
        '<div class="gd-field"><label for="gd-url">Backup link (optional)</label>' +
        '<input id="gd-url" type="url" placeholder="Optional YouTube / Apple Music / other link" value="' + (existing && existing.song_url ? escapeHtml(existing.song_url) : '') + '" /></div>' +
        '<p class="gd-spotify-note">Spotify will be searched automatically from the title + artist.</p>' +
        '<button class="gd-submit-btn" id="gd-submit-btn">' + (existing ? 'Update your song' : 'Submit your song') + '</button>' +
      '</div>';

    document.getElementById("gd-switch-player").onclick = function() {
      clearSavedPlayer();
      render();
    };

    document.getElementById("gd-submit-btn").onclick = async function() {
      const title = document.getElementById("gd-title").value.trim();
      const artist = document.getElementById("gd-artist").value.trim();
      const url = document.getElementById("gd-url").value.trim();
      const btn = document.getElementById("gd-submit-btn");

      if (!title || !artist) {
        btn.textContent = "Add a title and artist first";
        setTimeout(function() { btn.textContent = existing ? "Update your song" : "Submit your song"; }, 1600);
        return;
      }

      btn.disabled = true;
      btn.textContent = "Submitting...";

      try {
        btn.textContent = "Finding Spotify match...";
        const spotify = await searchSpotify(title, artist);

        await saveSong(state.round.id, player, {
          title: spotify ? spotify.title : title,
          artist: spotify ? spotify.artist : artist,
          url: url,
          spotifyUrl: spotify ? spotify.spotifyUrl : null,
          spotifyEmbedUrl: spotify ? spotify.embedUrl : null,
          spotifyImage: spotify ? spotify.image : null,
          spotifyAlbum: spotify ? spotify.album : null,
          spotifyUri: spotify ? spotify.spotifyUri : null,
          spotifyPreviewUrl: spotify ? spotify.previewUrl : null
        });

        state.submissions = await loadSubmissions(state.round.id);
        render();
      } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.textContent = "Something went wrong — try again";
      }
    };
  }

function renderMusicZone(allSubmitted) {
  const zone = document.getElementById("gd-music-zone");
  if (!zone) return;

  if (!allSubmitted) {
    zone.innerHTML = "";
    return;
  }

  const spotifyTracks = state.submissions.filter(s => s.spotify_uri);
  const monthId = monthIdFromDay(state.round.id);
  const monthName = monthLabel(monthId);
  const playlistUrl = state.round.spotify_playlist_url || state.monthPlaylistUrl;

  const trackListHtml = state.submissions.map(function(sub, index) {
    return '<div class="gd-stub">' +
      '<div class="gd-stub-left">' +
        '<div class="gd-stub-date">' + (index + 1) + '. ' + escapeHtml(sub.player) + '</div>' +
        '<div class="gd-stub-main"><b>' + escapeHtml(sub.song_title) + '</b> — ' + escapeHtml(sub.song_artist) + '</div>' +
      '</div>' +
      '<div class="gd-stub-genre">' + (sub.spotify_uri ? 'Spotify' : 'Manual') + '</div>' +
    '</div>';
  }).join("");

  const statusHtml = state.round.spotify_playlist_url
    ? '<a class="gd-submit-btn" style="display:block;text-align:center;text-decoration:none;" href="' + escapeHtml(state.round.spotify_playlist_url) + '" target="_blank" rel="noopener">Open the ' + escapeHtml(monthName) + ' playlist</a>'
    : (spotifyTracks.length
      ? '<p class="gd-spotify-note" style="text-align:center;">Adding today&apos;s songs to Spotify automatically...</p>'
      : '<p class="gd-spotify-note" style="text-align:center;">No Spotify matches were found today, so nothing to add automatically.</p>');

  zone.innerHTML =
    '<p class="gd-hist-title" style="margin-top:28px;">Monthly Mixtape</p>' +
    '<div class="gd-ticket">' +
      '<p class="gd-genre-label">' + escapeHtml(monthName) + ' playlist</p>' +
      '<p class="gd-sub" style="margin-bottom:14px;">Today&apos;s five picks are added automatically to the running ' + escapeHtml(monthName) + ' playlist.</p>' +
      trackListHtml +
      '<div class="gd-perf"></div>' +
      statusHtml +
      '<p class="gd-spotify-note">' + spotifyTracks.length + ' / ' + NAMES.length + ' submissions have Spotify track IDs.</p>' +
      (!state.round.spotify_playlist_url && state.monthPlaylistUrl
        ? '<a class="gd-edit-link" style="display:block;margin-top:10px;" href="' + escapeHtml(state.monthPlaylistUrl) + '" target="_blank" rel="noopener">View the ' + escapeHtml(monthName) + ' playlist so far &rarr;</a>'
        : '') +
    '</div>';

  if (!state.round.spotify_playlist_url && spotifyTracks.length) {
    triggerAutoPlaylistSync(state.round.id);
  }
}
