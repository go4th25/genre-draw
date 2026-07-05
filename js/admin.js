function adminStat(label, value) {
    return '<div class="gd-admin-stat">' +
      '<div class="gd-admin-stat-label">' + escapeHtml(label) + '</div>' +
      '<div class="gd-admin-stat-value">' + escapeHtml(String(value)) + '</div>' +
    '</div>';
  }

function adminPromptOptions() {
    return PROMPTS.map(function(prompt) {
      return '<option value="' + escapeHtml(prompt) + '"' + (state.round && state.round.genre === prompt ? ' selected' : '') + '>' + escapeHtml(prompt) + '</option>';
    }).join("");
  }

function adminPlayerOptions() {
    const saved = getSavedPlayer();
    return NAMES.map(function(name) {
      return '<option value="' + escapeHtml(name) + '"' + (saved === name ? ' selected' : '') + '>' + escapeHtml(name) + '</option>';
    }).join("");
  }

function spotifyAdminConnectUrl() {
    const returnTo = window.location.pathname + window.location.search;
    return "/.netlify/functions/spotify-auth-start?mode=admin&returnTo=" + encodeURIComponent(returnTo);
  }

function renderAdmin(message) {
    const round = state.round;
    const submittedCount = state.submissions.length;
    const savedPlayer = getSavedPlayer() || "None";

    const submissionsHtml = NAMES.map(function(name) {
      const sub = getSubmissionFor(name);
      return '<div class="gd-stub">' +
        '<div class="gd-stub-left">' +
          '<div class="gd-stub-date">' + escapeHtml(name) + '</div>' +
          '<div class="gd-stub-main">' + (sub ? '<b>' + escapeHtml(sub.song_title) + '</b> — ' + escapeHtml(sub.song_artist) : '<span style="color:var(--muted)">No submission</span>') + '</div>' +
        '</div>' +
        '<div class="gd-stub-genre">' + (sub ? 'Ready' : 'Open') + '</div>' +
      '</div>';
    }).join("");

    const recentRoundsHtml = state.history.length
      ? state.history.map(function(h) {
          return '<div class="gd-stub">' +
            '<div class="gd-stub-left">' +
              '<div class="gd-stub-date">' + prettyDate(h.id) + '</div>' +
              '<div class="gd-stub-main"><b>' + escapeHtml(h.genre) + '</b></div>' +
            '</div>' +
          '</div>';
        }).join("")
      : '<p class="gd-empty">No past rounds yet.</p>';

    root.innerHTML =
      '<div class="gd-header">' +
        '<p class="gd-eyebrow">Developer Console</p>' +
        '<h1 class="gd-title">Genre <span>Admin</span></h1>' +
        '<p class="gd-sub">Hidden testing tools for the daily game.</p>' +
      '</div>' +

      (message ? '<div class="gd-submitted" style="border-left-color:var(--cyan);margin-bottom:14px;">' + escapeHtml(message) + '</div>' : '') +

      '<div class="gd-ticket">' +
        '<div class="gd-ticket-top"><span>Current Round</span><span>' + prettyDate(round.id) + '</span></div>' +
        '<p class="gd-drawn-for">Today&apos;s prompt</p>' +
        '<div class="gd-genre-stamp">' + escapeHtml(round.genre) + '</div>' +
        '<div class="gd-admin-grid">' +
          adminStat('Date', round.id) +
          adminStat('Player', savedPlayer) +
          adminStat('Submissions', submittedCount + ' / ' + NAMES.length) +
        '</div>' +
      '</div>' +

      '<p class="gd-hist-title">Spotify (app-wide)</p>' +
      '<div class="gd-ticket">' +
        '<div class="gd-admin-grid">' +
          '<div class="gd-admin-stat">' +
            '<div class="gd-admin-stat-label">Connected</div>' +
            '<div class="gd-admin-stat-value" id="gd-spotify-status">Checking...</div>' +
          '</div>' +
        '</div>' +
        '<p class="gd-spotify-note" style="margin:10px 0 14px;">Only needs to be done once, ever — after this, every round&apos;s songs sync to Spotify automatically, for everyone, with no per-player connection needed.</p>' +
        '<a class="gd-admin-btn" style="display:inline-block;text-decoration:none;text-align:center;" href="' + spotifyAdminConnectUrl() + '">🎧 Connect Spotify (app-wide)</a>' +
      '</div>' +

      '<p class="gd-hist-title">Actions</p>' +
      '<div class="gd-ticket">' +
        '<div class="gd-field"><label for="gd-admin-player">Saved player on this browser</label>' +
          '<select id="gd-admin-player" class="gd-admin-select">' + adminPlayerOptions() + '</select>' +
        '</div>' +
        '<button class="gd-admin-btn" id="gd-admin-save-player">👤 Save selected player</button>' +
        '<button class="gd-admin-btn" id="gd-admin-clear-player">🧹 Clear saved player</button>' +
        '<div class="gd-perf"></div>' +
        '<div class="gd-field"><label for="gd-admin-prompt">Force today&apos;s prompt</label>' +
          '<select id="gd-admin-prompt" class="gd-admin-select">' + adminPromptOptions() + '</select>' +
        '</div>' +
        '<button class="gd-admin-btn" id="gd-admin-force-prompt">🎲 Apply prompt</button>' +
        '<div class="gd-perf"></div>' +
        '<div class="gd-admin-actions">' +
          '<button class="gd-admin-btn" id="gd-admin-demo">🎵 Fill demo songs</button>' +
          '<button class="gd-admin-btn gd-admin-danger" id="gd-admin-reset">🔄 Reset today&apos;s round</button>' +
          '<button class="gd-admin-btn" id="gd-admin-game">↩ Back to game</button>' +
        '</div>' +
      '</div>' +

      '<p class="gd-hist-title">Today&apos;s Submissions</p>' +
      submissionsHtml +

      '<p class="gd-hist-title" style="margin-top:28px;">Recent Rounds</p>' +
      recentRoundsHtml;

    wireAdminButtons();
    checkSpotifyAdminStatus();
  }

async function checkSpotifyAdminStatus() {
    const el = document.getElementById("gd-spotify-status");
    if (!el) return;
    try {
      const res = await fetch("/.netlify/functions/spotify-admin-status");
      const data = await res.json();
      el.textContent = data.connected ? "Yes ✅" : "Not yet ❌";
    } catch (e) {
      el.textContent = "Unknown";
    }
  }

async function reloadAdmin(message) {
    const submissions = await loadSubmissions(state.round.id);
    const history = await loadHistory(state.round.id);
    state.submissions = submissions;
    state.history = history;
    renderAdmin(message);
  }

function wireAdminButtons() {
    document.getElementById("gd-admin-save-player").onclick = function() {
      savePlayer(document.getElementById("gd-admin-player").value);
      renderAdmin("Saved player updated.");
    };

    document.getElementById("gd-admin-clear-player").onclick = function() {
      clearSavedPlayer();
      renderAdmin("Saved player cleared.");
    };

    document.getElementById("gd-admin-game").onclick = function() {
      window.location.href = window.location.pathname;
    };

    document.getElementById("gd-admin-force-prompt").onclick = async function() {
      const prompt = document.getElementById("gd-admin-prompt").value;
      const { error } = await sb.from("gd_rounds").update({ genre: prompt }).eq("id", state.round.id);
      if (error) {
        console.error(error);
        renderAdmin("Could not update prompt. Check RLS update policy for gd_rounds.");
        return;
      }
      state.round.genre = prompt;
      renderAdmin("Today&apos;s prompt changed to " + prompt + ".");
    };

    document.getElementById("gd-admin-reset").onclick = async function() {
      if (!confirm("Reset today&apos;s round? This deletes today&apos;s submissions.")) return;
      const { error } = await sb.from("gd_rounds").delete().eq("id", state.round.id);
      if (error) {
        console.error(error);
        renderAdmin("Could not reset round. Check RLS delete policy for gd_rounds.");
        return;
      }
      window.location.reload();
    };

    document.getElementById("gd-admin-demo").onclick = async function() {
      const btn = document.getElementById("gd-admin-demo");
      btn.disabled = true;
      btn.textContent = "Filling demo songs...";
      try {
        await fillDemoSongs();
        await reloadAdmin("Demo songs added.");
      } catch (e) {
        console.error(e);
        renderAdmin("Could not fill demo songs. Check console for details.");
      }
    };
  }

async function fillDemoSongs() {
    const demo = [
      { player: "Nick", title: "Dreams", artist: "Fleetwood Mac" },
      { player: "Nani", title: "Sweet Disposition", artist: "The Temper Trap" },
      { player: "Trenton", title: "Space Song", artist: "Beach House" },
      { player: "Danny", title: "Electric Feel", artist: "MGMT" },
      { player: "Jace", title: "Everybody Wants To Rule The World", artist: "Tears For Fears" }
    ];

    for (const item of demo) {
      const spotify = await searchSpotify(item.title, item.artist);
      await saveSong(state.round.id, item.player, {
        title: spotify ? spotify.title : item.title,
        artist: spotify ? spotify.artist : item.artist,
        url: null,
        spotifyUrl: spotify ? spotify.spotifyUrl : null,
        spotifyEmbedUrl: spotify ? spotify.embedUrl : null,
        spotifyImage: spotify ? spotify.image : null,
        spotifyAlbum: spotify ? spotify.album : null,
        spotifyUri: spotify ? spotify.spotifyUri : null,
        spotifyPreviewUrl: spotify ? spotify.previewUrl : null
      });
    }
  }
