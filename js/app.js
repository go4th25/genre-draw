async function init() {
  try {
    handleSpotifyRedirectIfNeeded();

    const config = await getConfig();
    const result = await getOrCreateRound(config);
    const submissions = await loadSubmissions(result.round.id);
    const votes = await loadVotes(result.round.id);
    const history = await loadHistory(result.round.id);

    state = {
      config: result.config,
      round: result.round,
      submissions: submissions,
      votes: votes,
      history: history
    };

    if (!isAdminMode() && localStorage.getItem("gdPendingPlaylist") === "1" && isSpotifyConnected()) {
      localStorage.removeItem("gdPendingPlaylist");
      try {
        await createSpotifyPlaylistForRound();
      } catch (playlistError) {
        console.warn("Pending Spotify playlist creation failed", playlistError);
      }
    }

    if (isAdminMode()) {
      renderAdmin();
    } else {
      render();
    }
  } catch (e) {
    console.error(e);
    root.innerHTML = '<div class="gd-error">Couldn&apos;t connect to the database. Check the browser console for details.</div>';
  }
}

init();
