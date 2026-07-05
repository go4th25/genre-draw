async function init() {
  try {
    const config = await getConfig();
    const result = await getOrCreateRound(config);
    const submissions = await loadSubmissions(result.round.id);
    const history = await loadHistory(result.round.id);
    const monthPlaylist = await getMonthPlaylist(monthIdFromDay(result.round.id));
    const recentSubmissionDays = await loadRecentSubmissionDays();

    state = {
      config: result.config,
      round: result.round,
      submissions: submissions,
      history: history,
      monthPlaylistUrl: monthPlaylist ? monthPlaylist.spotify_playlist_url : null,
      streaks: computeStreaks(recentSubmissionDays, result.round.id)
    };

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
