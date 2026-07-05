// Global app configuration and shared state
var APP_VERSION = "0.11.0";
var SUPABASE_URL = "https://cqnpjwyldsuxkpazsoxx.supabase.co";
var SUPABASE_KEY = "sb_publishable_UjD0ZU9zQ3SGLM0FV1uKQA_IitMevWS";
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Public Spotify Client ID. This is safe to include in browser code for OAuth PKCE.
var SPOTIFY_CLIENT_ID = "a68172651aec491c944c7718b0cee268";
var SPOTIFY_SCOPES = "playlist-modify-private playlist-modify-public";

var NAMES = ["Nick", "Nani", "Trenton", "Danny", "Jace"];
var PROMPTS = [
  "Songs that mention a color", "Road trip, 2010s", "One-word song titles",
  "Songs that sound like a fever dream", "Sunday morning, no rush",
  "Songs with a number in the title", "A guilty pleasure from middle school",
  "Songs that mention rain or weather", "Late night drive, windows down",
  "A song your parents played too much", "Songs that namecheck a city",
  "Beach day, 2000s", "Songs with a question in the title",
  "First dance at a wedding", "Songs that mention food",
  "Villain origin story soundtrack", "Songs under 3 minutes",
  "A song that peaked at a party", "Songs with a season in the title",
  "Studying for a test you didn't prepare for", "Songs that mention an animal",
  "Breakup, but make it upbeat", "Songs with a day of the week in the title",
  "A song you'd play for aliens as proof humanity was fine",
  "Songs that start with a scream, shout, or yell", "Getting ready to go out, 1990s",
  "Songs that mention money", "A slow burn that explodes halfway through",
  "Songs with a name in the title", "The last song on the aux before everyone goes home"
];

var root = document.getElementById("gd-app");
var state = { config: null, round: null, submissions: [], history: [] };
var PLAYER_KEY = "genreDrawPlayer";
