function getSavedPlayer() {
    const saved = localStorage.getItem(PLAYER_KEY);
    return NAMES.indexOf(saved) !== -1 ? saved : null;
  }

function savePlayer(name) {
    if (NAMES.indexOf(name) !== -1) localStorage.setItem(PLAYER_KEY, name);
  }

function clearSavedPlayer() {
    localStorage.removeItem(PLAYER_KEY);
  }
