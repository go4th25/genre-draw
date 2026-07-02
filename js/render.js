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
            spotifyEmbedHtml(sub) +
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
        '<p class="gd-sub">One genre. Five songs. Let the debate begin.</p>' +
      '</div>' +

      '<div class="gd-ticket">' +
        '<div class="gd-ticket-top"><span>Group Round</span><span>' + prettyDate(round.id) + '</span></div>' +
        '<p class="gd-drawn-for">Today&apos;s genre</p>' +
        '<div class="gd-genre-stamp">' + escapeHtml(round.genre) + '</div>' +
        '<div class="gd-status-row"><span class="gd-dot ' + (allSubmitted ? 'gd-done' : 'gd-live') + '"></span><span>' + submittedCount + ' / ' + NAMES.length + ' songs submitted' + (allSubmitted ? ' — submissions locked' : '') + '</span></div>' +
        '<div class="gd-perf"></div>' +
        '<div id="gd-form-zone"></div>' +
      '</div>' +

      '<p class="gd-hist-title">Today&apos;s Submissions</p>' +
      playerListHtml +

      '<div id="gd-vote-zone"></div>' +

      '<p class="gd-hist-title" style="margin-top:28px;">Past Rounds</p>' +
      historyHtml;

    renderFormZone();
    renderVoteZone(allSubmitted);
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
          spotifyEmbedHtml(existing) +
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
          spotifyAlbum: spotify ? spotify.album : null
        });

        state.submissions = await loadSubmissions(state.round.id);
        state.votes = await loadVotes(state.round.id);
        render();
      } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.textContent = "Something went wrong — try again";
      }
    };
  }

function renderVoteZone(allSubmitted) {
    const zone = document.getElementById("gd-vote-zone");
    const savedPlayer = getSavedPlayer();

    if (!allSubmitted) {
      zone.innerHTML =
        '<p class="gd-hist-title" style="margin-top:28px;">Voting</p>' +
        '<p class="gd-empty">Voting unlocks once all 5 songs are submitted.</p>';
      return;
    }

    const leaderboard = leaderboardRows();
    const leaderboardHtml = leaderboard.map(function(row, index) {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
      const avgText = row.count ? row.avg.toFixed(1) : "—";
      return '<div class="gd-stub">' +
        '<div class="gd-stub-left">' +
          '<div class="gd-stub-date">' + medal + ' ' + escapeHtml(row.submission.player) + '</div>' +
          '<div class="gd-stub-main"><b>' + escapeHtml(row.submission.song_title) + '</b> — ' + escapeHtml(row.submission.song_artist) + '</div>' +
          spotifySmallHtml(row.submission) +
          spotifyEmbedHtml(row.submission) +
        '</div>' +
        '<div class="gd-stub-genre">' + avgText + '</div>' +
      '</div>';
    }).join("");

    if (!savedPlayer) {
      zone.innerHTML =
        '<p class="gd-hist-title" style="margin-top:28px;">Voting</p>' +
        '<p class="gd-empty">Choose who you are above to vote.</p>' +
        '<p class="gd-hist-title" style="margin-top:28px;">Leaderboard</p>' +
        leaderboardHtml;
      return;
    }

    zone.innerHTML =
      '<p class="gd-hist-title" style="margin-top:28px;">Voting</p>' +
      '<div class="gd-ticket" style="margin-top:8px;">' +
        '<p class="gd-genre-label">Cast votes</p>' +
        '<div class="gd-status-row" style="margin-top:0;margin-bottom:14px;">' +
          '<span>Voting as <b>' + escapeHtml(savedPlayer) + '</b></span>' +
        '</div>' +
        '<div id="gd-vote-list"></div>' +
      '</div>' +
      '<p class="gd-hist-title" style="margin-top:28px;">Leaderboard</p>' +
      leaderboardHtml;

    setupVoteControls(savedPlayer);
  }

function setupVoteControls(voter) {
    const voteList = document.getElementById("gd-vote-list");

    function scoreOptions(current) {
      let html = '<option value="">Score</option>';
      for (let i = 1; i <= 10; i++) {
        html += '<option value="' + i + '"' + (Number(current) === i ? ' selected' : '') + '>' + i + '</option>';
      }
      return html;
    }

    const voteable = state.submissions.filter(s => s.player !== voter);

    voteList.innerHTML = voteable.map(function(sub) {
      const existing = getVote(voter, sub.id);
      const current = existing ? existing.score : "";

      const voteControl = existing
        ? '<div class="gd-stub-genre">' + escapeHtml(String(current)) + '/10 locked</div>'
        : '<select class="gd-score-select" data-submission-id="' + sub.id + '" style="background:var(--panel-2);border:1px solid rgba(242,236,216,0.14);border-radius:8px;padding:8px;color:var(--paper);font-family:JetBrains Mono,monospace;font-size:12px;">' +
            scoreOptions(current) +
          '</select>';

      return '<div class="gd-stub">' +
        '<div class="gd-stub-left">' +
          '<div class="gd-stub-date">' + escapeHtml(sub.player) + '</div>' +
          '<div class="gd-stub-main"><b>' + escapeHtml(sub.song_title) + '</b> — ' + escapeHtml(sub.song_artist) + '</div>' +
          spotifySmallHtml(sub) +
          spotifyEmbedHtml(sub) +
        '</div>' +
        voteControl +
      '</div>';
    }).join("");

    Array.from(document.querySelectorAll(".gd-score-select")).forEach(function(select) {
      select.onchange = async function() {
        const score = Number(select.value);
        const submissionId = select.getAttribute("data-submission-id");
        if (!score) return;

        select.disabled = true;
        try {
          await saveVote(state.round.id, voter, submissionId, score);
          state.votes = await loadVotes(state.round.id);
          render();
        } catch (e) {
          console.error(e);
          select.disabled = false;
        }
      };
    });
  }
