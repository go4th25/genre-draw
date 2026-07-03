function todayStr() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const y = parts.find(p => p.type === "year").value;
    const m = parts.find(p => p.type === "month").value;
    const d = parts.find(p => p.type === "day").value;

    return y + "-" + m + "-" + d;
  }

function prettyDate(iso) {
    const parts = iso.split("-").map(Number);
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

function pickGenre(recent) {
    const pool = GENRES.filter(g => recent.indexOf(g) === -1);
    const usable = pool.length ? pool : GENRES;
    return usable[Math.floor(Math.random() * usable.length)];
  }

function monthIdFromDay(dayId) {
    return dayId.slice(0, 7); // 'YYYY-MM-DD' -> 'YYYY-MM'
  }

function monthLabel(monthId) {
    const parts = monthId.split("-").map(Number);
    const dt = new Date(parts[0], parts[1] - 1, 1);
    return dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
