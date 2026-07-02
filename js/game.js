function getSubmissionFor(player) {
    return state.submissions.find(s => s.player === player);
  }

function getVote(voter, submissionId) {
    return state.votes.find(v => v.voter === voter && v.submission_id === submissionId);
  }

function leaderboardRows() {
    return state.submissions.map(function(sub) {
      const votesForSong = state.votes.filter(v => v.submission_id === sub.id);
      const total = votesForSong.reduce((sum, v) => sum + Number(v.score || 0), 0);
      const avg = votesForSong.length ? total / votesForSong.length : 0;
      return { submission: sub, count: votesForSong.length, avg: avg };
    }).sort(function(a, b) { return b.avg - a.avg; });
  }

function isAdminMode() {
    return new URLSearchParams(window.location.search).has("admin");
  }

function totalPossibleVotes() {
    return NAMES.length * (NAMES.length - 1);
  }
