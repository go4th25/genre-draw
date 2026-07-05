function getSubmissionFor(player) {
    return state.submissions.find(s => s.player === player);
  }

function isAdminMode() {
    return new URLSearchParams(window.location.search).has("admin");
  }
